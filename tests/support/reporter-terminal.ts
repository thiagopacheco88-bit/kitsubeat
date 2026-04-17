/**
 * tests/support/reporter-terminal.ts — Terminal-first Playwright reporter.
 *
 * Implements the Playwright Reporter interface with concise, plain-ASCII output
 * that renders correctly on Windows cmd. Aligns with the CLI-heavy workflow used
 * for seed scripts (npm run audit:geo, etc.) — QA output should look like those
 * scripts, not a web dashboard.
 *
 * Output format:
 *   PASS  tests/app.spec.ts::Home Page > loads with hero (123ms)
 *   FAIL  tests/app.spec.ts::Songs > search filter works
 *     Error: expect(received).toBe(expected) ...
 *
 *   --- Suite summary ---
 *   Total:   12  Passed: 10  Failed: 2  Skipped: 0
 *   2 failed:
 *     - tests/app.spec.ts::Songs > search filter works
 *     - tests/app.spec.ts::Songs > JLPT filter works
 *
 * Used as the default Playwright reporter; the HTML reporter is opt-in via
 * `npm run test:report` (see package.json).
 */

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

interface FailureRecord {
  path: string;
  title: string;
  errorFirstLine: string;
}

class TerminalReporter implements Reporter {
  private totalTests = 0;
  private passed = 0;
  private failed = 0;
  private skipped = 0;
  private failures: FailureRecord[] = [];

  onBegin(_config: FullConfig, suite: Suite): void {
    this.totalTests = suite.allTests().length;
    process.stdout.write(`\nRunning ${this.totalTests} test(s)...\n\n`);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const filePath = this.relativePath(test.location.file);
    const title = test.titlePath().filter(Boolean).slice(2).join(" > ") || test.title;
    const duration = `${result.duration}ms`;

    if (result.status === "passed") {
      this.passed += 1;
      process.stdout.write(`PASS  ${filePath}::${title} (${duration})\n`);
      return;
    }

    if (result.status === "skipped") {
      this.skipped += 1;
      process.stdout.write(`SKIP  ${filePath}::${title}\n`);
      return;
    }

    // failed, timedOut, interrupted — all count as failures
    this.failed += 1;
    const errorFirstLine = this.extractFirstErrorLine(result);
    this.failures.push({ path: filePath, title, errorFirstLine });
    process.stdout.write(`FAIL  ${filePath}::${title}\n`);
    if (errorFirstLine) {
      process.stdout.write(`      ${errorFirstLine}\n`);
    }
  }

  onEnd(_result: FullResult): void {
    process.stdout.write(`\n--- Suite summary ---\n`);
    process.stdout.write(
      `Total: ${this.totalTests}  Passed: ${this.passed}  Failed: ${this.failed}  Skipped: ${this.skipped}\n`
    );

    if (this.failures.length > 0) {
      process.stdout.write(`\n${this.failures.length} failed:\n`);
      for (const failure of this.failures) {
        process.stdout.write(`  - ${failure.path}::${failure.title}\n`);
      }
    }

    process.stdout.write(`\n`);
    // Do NOT call process.exit — Playwright handles the exit code based on FullResult.
  }

  private relativePath(absolutePath: string): string {
    const cwd = process.cwd().replace(/\\/g, "/");
    const normalized = absolutePath.replace(/\\/g, "/");
    if (normalized.startsWith(cwd)) {
      return normalized.slice(cwd.length + 1);
    }
    return normalized;
  }

  private extractFirstErrorLine(result: TestResult): string {
    const error = result.error ?? result.errors?.[0];
    if (!error) return "";
    const message = error.message ?? "";
    const firstLine = message.split("\n").find((line) => line.trim().length > 0) ?? "";
    return firstLine.trim();
  }
}

export default TerminalReporter;
