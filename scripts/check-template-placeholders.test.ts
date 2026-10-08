// @vitest-environment node

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, expect, it } from "vitest";

const cli = fileURLToPath(new URL("./check-template-placeholders.mjs", import.meta.url));
const directories: string[] = [];
const marker = "<" + "FILL: title>";

function directory() {
  const path = mkdtempSync(join(tmpdir(), "sgta-template-check-"));
  directories.push(path);
  return path;
}

function git(cwd: string, ...arguments_: string[]) {
  const result = spawnSync("git", arguments_, { cwd, encoding: "utf8" });
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
}

function repository() {
  const cwd = directory();
  git(cwd, "init", "--quiet");
  return cwd;
}

function file(cwd: string, path: string, content: string, tracked = true) {
  const target = join(cwd, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  if (tracked) git(cwd, "add", "--", path);
}

function check(cwd: string, env = process.env) {
  const result = spawnSync(process.execPath, [cli], { cwd, env, encoding: "utf8" });
  expect(result.error).toBeUndefined();
  return result;
}

afterEach(() => {
  for (const path of directories.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

it("accepts clean tracked Markdown", () => {
  const cwd = repository();
  file(cwd, "README.md", "# Project\nstatus: ready\n");
  const result = check(cwd);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("Template validation passed");
});

it.each([
  marker,
  "<" + "FILL>",
  "<" + "OPTIONAL: note>",
  "<" + "OPTIONAL>",
  "TEMPLATE" + " project",
  "# TEMPLATE" + " project",
  "status:" + " template",
])("rejects a tracked Markdown placeholder: %s", (content) => {
  const cwd = repository();
  file(cwd, "docs/guide.md", `Introduction\n${content}\n`);
  const result = check(cwd);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Unfilled template placeholders");
  expect(result.stderr).toContain(`docs/guide.md:2:${content}`);
});

it.each([
  ".agents/skills/example/SKILL.md",
  ".claude/skills/example/SKILL.md",
  "guide.template.md",
  "docs/nested/guide.template.ts",
])("excludes tracked template path %s", (path) => {
  const cwd = repository();
  file(cwd, path, marker);
  expect(check(cwd).status).toBe(0);
});

it("ignores ignored local documents and untracked files", () => {
  const cwd = repository();
  file(cwd, ".gitignore", "local-docs/\n");
  file(cwd, "local-docs/plan.md", marker, false);
  file(cwd, "untracked.md", marker, false);
  expect(check(cwd).status).toBe(0);
});

it("checks working-tree content of tracked files, including from a subdirectory", () => {
  const cwd = repository();
  file(cwd, "README.md", "Clean\n");
  file(cwd, "docs/guide.md", "Clean\n");
  file(cwd, "README.md", marker, false);
  expect(check(join(cwd, "docs")).stderr).toContain("README.md:1:");
  expect(check(join(cwd, "docs")).status).toBe(1);
});

it("preserves Git's binary match handling", () => {
  const cwd = repository();
  file(cwd, "fixture.bin", `\0${marker}\n`);
  const result = check(cwd);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Binary file fixture.bin matches");
});

it("accepts clean binary files", () => {
  const cwd = repository();
  file(cwd, "fixture.bin", "\0Clean\n");
  expect(check(cwd).status).toBe(0);
});

it("fails with a distinct diagnostic outside a Git repository", () => {
  const result = check(directory());
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Template validation could not run Git");
  expect(result.stderr).not.toContain("Unfilled template placeholders");
});

it("fails when Git is unavailable", () => {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "path"),
  );
  const result = check(directory(), { ...env, NODE_ENV: process.env.NODE_ENV, PATH: directory() });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Template validation could not run Git");
  expect(result.stderr).toContain("ENOENT");
});
