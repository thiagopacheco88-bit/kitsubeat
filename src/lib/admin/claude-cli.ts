import { spawn } from "node:child_process";

export interface ClaudePrintOptions {
  /** Hard timeout in ms. Default 180_000 (3 min). */
  timeoutMs?: number;
  /** Optional AbortSignal (e.g. from Next.js request). */
  signal?: AbortSignal;
  /** CLI path. Defaults to "claude" — relies on PATH. */
  cliPath?: string;
}

export interface ClaudePrintResult {
  /** Parsed envelope JSON: { type, subtype, result, session_id, ... } */
  envelope: {
    type: string;
    subtype: string;
    result: string;
    session_id?: string;
    total_cost_usd?: number;
    usage?: { input_tokens: number; output_tokens: number };
  };
  /** stderr captured (for diagnosis on auth-prompt or other warnings). */
  stderr: string;
  /** Wall-clock duration in ms. */
  durationMs: number;
}

export class ClaudePrintError extends Error {
  constructor(
    message: string,
    public readonly code: "spawn_failed" | "non_zero_exit" | "timeout" | "invalid_json" | "auth_prompt",
    public readonly stderr: string,
    public readonly stdout: string,
  ) {
    super(message);
    this.name = "ClaudePrintError";
  }
}

/**
 * Spawn `claude --print --output-format=json` with the prompt piped via stdin.
 * Returns the parsed envelope. Throws ClaudePrintError on any failure path.
 */
export async function runClaudePrint(
  prompt: string,
  opts: ClaudePrintOptions = {},
): Promise<ClaudePrintResult> {
  const cli = opts.cliPath ?? "claude";
  const timeoutMs = opts.timeoutMs ?? 180_000;
  const startedAt = Date.now();

  return new Promise<ClaudePrintResult>((resolve, reject) => {
    const child = spawn(cli, ["--print", "--output-format=json"], {
      stdio: ["pipe", "pipe", "pipe"],
      // Inherit env so ~/.claude/ credentials are picked up
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new ClaudePrintError(
        `claude --print exceeded ${timeoutMs}ms`, "timeout", stderr, stdout));
    }, timeoutMs);

    opts.signal?.addEventListener("abort", () => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      clearTimeout(timer);
      reject(new ClaudePrintError("aborted", "spawn_failed", stderr, stdout));
    });

    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new ClaudePrintError(
        `spawn failed: ${err.message}`, "spawn_failed", stderr, stdout));
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      // Detect auth-prompt heuristically — exit 0 but stderr carries known phrases
      const authPromptHints = ["sign in", "log in", "claude login", "auth", "authenticate"];
      const looksLikeAuth = authPromptHints.some((h) =>
        stderr.toLowerCase().includes(h));

      if (code !== 0) {
        const codeKind = looksLikeAuth ? "auth_prompt" : "non_zero_exit";
        return reject(new ClaudePrintError(
          `claude --print exited ${code}`, codeKind, stderr, stdout));
      }

      try {
        const envelope = JSON.parse(stdout.trim());
        if (envelope.type !== "result" || envelope.subtype !== "success") {
          return reject(new ClaudePrintError(
            `unexpected envelope: type=${envelope.type} subtype=${envelope.subtype}`,
            "invalid_json", stderr, stdout));
        }
        resolve({ envelope, stderr, durationMs: Date.now() - startedAt });
      } catch (parseErr) {
        reject(new ClaudePrintError(
          `stdout not parseable JSON: ${(parseErr as Error).message}`,
          "invalid_json", stderr, stdout));
      }
    });

    // Pipe prompt to stdin
    child.stdin.end(prompt, "utf8");
  });
}

/**
 * Convenience: extract the model's textual response (envelope.result),
 * strip ```json fences if present, parse as JSON, validate against a Zod schema.
 */
import type { ZodSchema } from "zod";

export async function runClaudePrintParseJson<T>(
  prompt: string,
  schema: ZodSchema<T>,
  opts?: ClaudePrintOptions,
): Promise<T> {
  const { envelope } = await runClaudePrint(prompt, opts);
  let resultText = envelope.result.trim();
  if (resultText.startsWith("```")) {
    resultText = resultText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  const json: unknown = JSON.parse(resultText);
  return schema.parse(json);
}
