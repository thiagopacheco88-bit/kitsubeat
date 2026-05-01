import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";
import { z } from "zod";

// vi.mock is hoisted to top of file; use vi.hoisted to safely reference the mock fn
const { mockSpawn } = vi.hoisted(() => ({ mockSpawn: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: mockSpawn }));

import { runClaudePrint, runClaudePrintParseJson, ClaudePrintError } from "./claude-cli";

function makeMockChild() {
  const child = new EventEmitter() as unknown as ChildProcess;
  (child as any).stdout = new EventEmitter();
  (child as any).stderr = new EventEmitter();
  (child as any).stdin = { end: vi.fn() };
  (child as any).kill = vi.fn();
  return child;
}

describe("runClaudePrint", () => {
  beforeEach(() => { mockSpawn.mockReset(); });

  it("resolves with envelope on happy path", async () => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);
    const promise = runClaudePrint("hi", { timeoutMs: 5000 });

    setTimeout(() => {
      (child as any).stdout.emit("data", Buffer.from(JSON.stringify({
        type: "result", subtype: "success", result: "ok"
      })));
      (child as any).emit("close", 0);
    }, 5);

    const r = await promise;
    expect(r.envelope.type).toBe("result");
    expect(r.envelope.subtype).toBe("success");
    expect(r.envelope.result).toBe("ok");
    expect((child as any).stdin.end).toHaveBeenCalledWith("hi", "utf8");
  });

  it("rejects with code=timeout when subprocess emits nothing", async () => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);
    await expect(runClaudePrint("hi", { timeoutMs: 50 })).rejects.toMatchObject({
      code: "timeout",
    });
    expect((child as any).kill).toHaveBeenCalled();
  });

  it("rejects with code=non_zero_exit when exit is non-zero (no auth keywords)", async () => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);
    const promise = runClaudePrint("hi", { timeoutMs: 5000 });

    setTimeout(() => {
      (child as any).stderr.emit("data", Buffer.from("random other error"));
      (child as any).emit("close", 2);
    }, 5);

    await expect(promise).rejects.toMatchObject({ code: "non_zero_exit" });
  });

  it("rejects with code=invalid_json when stdout is not parseable", async () => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);
    const promise = runClaudePrint("hi", { timeoutMs: 5000 });

    setTimeout(() => {
      (child as any).stdout.emit("data", Buffer.from("not json at all"));
      (child as any).emit("close", 0);
    }, 5);

    await expect(promise).rejects.toMatchObject({ code: "invalid_json" });
  });

  it("rejects with code=auth_prompt when stderr contains 'sign in'", async () => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);
    const promise = runClaudePrint("hi", { timeoutMs: 5000 });

    setTimeout(() => {
      (child as any).stderr.emit("data", Buffer.from("Please sign in to continue"));
      (child as any).emit("close", 1);
    }, 5);

    await expect(promise).rejects.toMatchObject({ code: "auth_prompt" });
  });

  it("ClaudePrintError instance carries stderr + stdout", async () => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);
    const promise = runClaudePrint("hi", { timeoutMs: 5000 });

    setTimeout(() => {
      (child as any).stderr.emit("data", Buffer.from("err msg"));
      (child as any).stdout.emit("data", Buffer.from("partial"));
      (child as any).emit("close", 3);
    }, 5);

    try {
      await promise;
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ClaudePrintError);
      expect((err as ClaudePrintError).stderr).toBe("err msg");
      expect((err as ClaudePrintError).stdout).toBe("partial");
    }
  });
});

describe("runClaudePrintParseJson", () => {
  beforeEach(() => { mockSpawn.mockReset(); });

  const Schema = z.object({ x: z.number() });

  it("strips ```json fences and validates against Zod schema", async () => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);
    const promise = runClaudePrintParseJson("hi", Schema, { timeoutMs: 5000 });

    setTimeout(() => {
      (child as any).stdout.emit("data", Buffer.from(JSON.stringify({
        type: "result", subtype: "success", result: "```json\n{\"x\":1}\n```"
      })));
      (child as any).emit("close", 0);
    }, 5);

    const result = await promise;
    expect(result).toEqual({ x: 1 });
  });

  it("throws ZodError when result fails schema", async () => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);
    const promise = runClaudePrintParseJson("hi", Schema, { timeoutMs: 5000 });

    setTimeout(() => {
      (child as any).stdout.emit("data", Buffer.from(JSON.stringify({
        type: "result", subtype: "success", result: '{"y":1}'
      })));
      (child as any).emit("close", 0);
    }, 5);

    await expect(promise).rejects.toThrow();  // ZodError
  });
});
