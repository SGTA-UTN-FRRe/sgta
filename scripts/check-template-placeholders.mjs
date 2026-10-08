import { spawnSync } from "node:child_process";

function runGit(arguments_, cwd) {
  return spawnSync("git", arguments_, { cwd, encoding: "utf8" });
}

function failGit(result) {
  console.error("Template validation could not run Git:");
  console.error(result.error?.message || result.stderr.trim() || `Git exited with status ${result.status}.`);
  process.exit(1);
}

const repository = runGit(["rev-parse", "--show-toplevel"], process.cwd());
if (repository.error || repository.status !== 0) {
  failGit(repository);
}

const scan = runGit(
  [
    "grep",
    "-nE",
    "<(FILL|OPTIONAL)[:>]|^(# )?TEMPLATE |^status: template$",
    "--",
    ".",
    ":!.agents/",
    ":!.claude/",
    ":!*.template.*",
  ],
  repository.stdout.trim(),
);

if (scan.error || (scan.status !== 0 && scan.status !== 1)) {
  failGit(scan);
}

if (scan.status === 0) {
  console.error("Unfilled template placeholders or template headers found:");
  process.stderr.write(scan.stdout);
  process.exit(1);
}

console.log("Template validation passed.");
