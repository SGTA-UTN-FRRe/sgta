---
name: implement-task
description: Use when the user asks to implement a concrete engineering task, task packet, approved plan item, feature slice, fix, refactor, or UI delivery. Reconcile the requested outcome with current repository reality, implement only the agreed scope, verify the smallest correct boundaries, and synchronize documentation that became true. Also handles queued task execution when the user explicitly asks to commit each completed task or open a PR after the final task.
---

# Implement Task

Use this skill for decision-complete implementation work.

## Core contract

- Implement the requested durable outcome, not the planning label that contains it.
- Read root `AGENTS.md` first.
- Treat current source, tests, manifests, runtime configuration, and CI as evidence of what exists now.
- Treat approved decision documents as target-state authority for the requested scope.
- Reconcile the plan with repository reality before editing.
- Keep one dominant outcome and avoid opportunistic unrelated cleanup.
- Never invent product rules or silently change an approved invariant.
- Do not create repository delivery artifacts unless explicitly requested; use `$git-delivery` when they are requested.

## Plan addressing

The user may identify work with planning coordinates such as `Phase 1 - Task 2`, `Task 4`, or a milestone label. These coordinates are valid for locating the requested plan item.

They are navigation metadata only:

1. resolve the referenced plan item;
2. extract its durable outcome, scope, acceptance criteria, dependencies, and verification;
3. implement that outcome;
4. do not copy the planning coordinates into code identifiers, filenames, commit subjects, PR text, or other repository-facing delivery artifacts.

## Queued execution contract

Support sequential prompts such as:

```text
Implement Phase 1 - Task 1. Commit the changes.
Implement Phase 1 - Task 2. Commit the changes.
Implement Phase 1 - Task 3. Commit the changes and open a PR.
```

Treat each requested task as an atomic execution unit.

Before starting each queued task:

- inspect the current branch and working tree;
- confirm the referenced task has not already been completed;
- confirm required predecessor tasks are present in the current branch history or repository state;
- do not mix unexplained leftover changes from a previous task into the new task;
- if the working tree contains unresolved changes from a failed or incomplete prior task, do not silently absorb them into the next task.

When the user explicitly requests `commit the changes`:

1. complete the requested task;
2. run the task's required verification;
3. review the diff for task scope;
4. synchronize documentation that became true;
5. use `$git-delivery` to create one cohesive commit for the task's durable outcome;
6. do not commit a known-broken or incomplete task merely because a commit was requested.

When the user explicitly requests `open a PR` after the task:

1. finish and commit the current task first;
2. confirm the working tree is clean apart from intentionally ignored/local planning material;
3. inspect the full branch diff against the normal base branch, not only the final task diff;
4. use `$git-delivery` to derive and open the PR from the complete branch outcome;
5. keep planning labels out of the PR title and body.

## Load only useful context

Start with:

1. the user's requested outcome or implementation packet;
2. root `AGENTS.md`;
3. the referenced execution plan when one exists;
4. directly relevant code and tests.

Then read only the authoritative documents required by the affected boundary.

For UI work, prefer the project's approved product design and UI specification over broad visual research.

For testing or CI work, read the current test guide and workflow configuration.

For data, auth, integration, or deployment work, read the relevant architecture and operational contracts.

## Preflight

Before editing, verify:

- referenced paths and APIs still exist;
- assumptions in the plan remain true;
- the requested behavior is not already implemented;
- dependencies and generated artifacts are understood;
- the intended verification boundary exists.

If the plan is stale but the durable outcome is still clear, adapt the implementation to current repository reality without preserving obsolete file-level instructions.

If authoritative product rules conflict materially, surface the conflict rather than selecting a new business rule silently.

## Implementation rules

- Prefer a coherent vertical change over file-by-file work.
- Follow existing repository architecture unless the approved outcome requires changing it.
- Validate inputs at real boundaries.
- Preserve type safety and established error handling.
- Add dependencies only when the implementation genuinely needs them.
- Do not edit generated files manually; use the repository's generator when applicable.
- Keep user-facing copy in the product's intended language while keeping engineering artifacts in English.
- Do not use roadmap labels or phase identifiers in new code identifiers, filenames, test names, comments, or delivery text unless they are literally part of the product domain.

## Verification

Verify from narrow to broad:

1. focused tests for changed behavior;
2. relevant lint/type/contract checks;
3. broader repository gate when appropriate for the scope.

For meaningful UI work, also inspect the states and viewports required by the project's UI specification.

Never claim a check passed unless it actually ran successfully.

When a check cannot run because of the environment, report the exact limitation and preserve the distinction between passed, failed, and not run.

## Diff review

Before completion or commit, inspect the resulting change for:

- scope creep;
- duplicated abstractions;
- accidental generated or temporary files;
- stale comments or docs;
- secrets or personal data;
- unrelated formatting churn;
- inconsistent product copy or engineering language;
- planning metadata leaking into repository-facing artifacts.

## Documentation sync

Update current-state documentation only for facts that became true because of this implementation.

Do not rewrite target-state specifications merely to mirror implementation details.

Do not create a new document when an existing source of truth already owns the information.

Keep temporary plans, review screenshots, audits, and scratch evidence local when the repository uses a local-docs boundary.

## Completion report

Return a concise completion report containing:

- what changed;
- verification actually performed and its status;
- commit created when explicitly requested;
- PR opened when explicitly requested;
- any genuine blocker or follow-up.

Do not add unrequested branch, PR, squash, or merge text.
