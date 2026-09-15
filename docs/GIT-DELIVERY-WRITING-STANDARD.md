---
document: GIT-DELIVERY-WRITING-STANDARD
mode: decision
type: project-delivery-and-writing-standard
status: approved
scope: SGTA branches, commits, pull requests, and squash merges
authority: repository-delivery
---

# SGTA - Git delivery and writing standard

> Project-adapted delivery language and branch workflow based on the engineering-playbook standards.

# AI reading contract

Mode: **decision**.

This document defines how SGTA changes are named, described, verified, reviewed, squash-merged, and cleaned up. The engineering-playbook remains the source of the global CI and GitHub governance principles; this document defines their concrete SGTA application.

## 1. Delivery lifecycle

```text
latest main → outcome branch → implement → verify → pull request → CI Gate → squash merge → delete branch
```

1. Start from the latest `main`.
2. Create one short-lived branch for one coherent product or engineering outcome.
3. Implement only the agreed scope.
4. Run the local verification documented in `docs/TESTING.md`.
5. Open a pull request before merging.
6. Resolve review conversations and wait for the required `CI Gate` check.
7. Use squash merge into `main`.
8. Delete the local and remote head branch after merge.

Direct pushes to `main` are not the normal delivery path.

`CI Gate` is the only stable technical status check intended for branch protection. `Quality`, `Tests`, `E2E`, `Production`, and future upstream jobs remain implementation details and must not become separate branch-protection contracts.

## 2. Branch naming

Use lowercase kebab-case with one descriptive prefix and an outcome-oriented name:

| Prefix | Use for | Example |
| --- | --- | --- |
| `feat/` | New user capability | `feat/register-tutor` |
| `fix/` | Bug or regression repair | `fix/preserve-filter-state` |
| `refactor/` | Behavior-preserving structural change | `refactor/split-route-composition` |
| `docs/` | Documentation or specification change | `docs/align-ci-testing-delivery-standards` |
| `chore/` | Tooling, dependency, or repository maintenance | `chore/update-playwright-runtime` |

The branch name must describe the durable outcome, not the planning container. Do not use roadmap labels, task labels, milestone labels, or the word `phase` in a branch name. Names such as `phase-2`, `phase-2-task-1`, `task-4`, and `milestone-2` are invalid.

Global naming rule: never generate the word `phase` (in any capitalization) in repository-facing output. This applies to branch names, commit subjects, pull-request titles or bodies, tags, filenames, directories, identifiers, labels, and suggested examples. Use the durable outcome instead. Existing roadmap text may retain the term only when describing the approved plan, never as a generated name or delivery label.

Use this form:

```text
<prefix>/<imperative-or-noun-outcome>
```

Examples:

```text
docs/align-ci-testing-delivery-standards
chore/add-ci-gate
feat/register-tutor
fix/avoid-duplicate-consultations
```

Do not include runtime versions, tool names, personal initials, or temporary context in the branch name unless they are the actual durable outcome.

## 3. Commit and pull-request titles

Use the same conventional form for ordinary commit subjects, PR titles, and final squash subjects:

```text
<type>: <imperative description>
```

Rules:

- use an imperative verb (`Add`, `Align`, `Fix`, `Refactor`, `Document`);
- keep the description concise and at most 72 characters when practical;
- omit a trailing period;
- describe the durable result, not the internal task number or roadmap label;
- do not use the word `phase` (in any capitalization) anywhere in the title or body;
- never use `WIP`, `updates`, `fixed stuff`, or past-tense subjects such as `Added` or `Fixed`.

Good:

```text
docs: align CI and delivery standards
chore: add stable CI Gate workflow
fix: preserve tutor filters after reload
```

Avoid:

```text
phase-2 task 1
updates
Fixed things
WIP
```

## 4. Pull-request structure

Every PR uses the repository template and contains these sections in this order:

### Summary

One or two sentences explaining the problem, durable outcome, and reason for the change.

### Changes

Short bullets describing the meaningful implementation or documentation changes. Do not list every touched file.

### Verification

List the exact commands, tests, manual checks, screenshots, or CI evidence used. State failures and workarounds explicitly; never claim a check passed when it did not run.

### Risk or notes

State rollback considerations, migrations, external dependencies, known limitations, or say `None` when there is no material risk.

### Checklist

Confirm local validation, relevant test coverage, the required `CI Gate`, and resolved conversations.

The canonical template is `.github/PULL_REQUEST_TEMPLATE.md`.

## 5. Squash and merge description

Squash is the only normal merge method. The final commit subject must equal the PR title and must remain understandable without the PR discussion.

Use this body structure for the squash commit when the hosting interface allows editing it:

```text
<PR title>

Summary:
<one or two sentences describing the durable outcome>

Changes:
- <meaningful change>
- <meaningful change>

Verification:
- <exact command or evidence>
- <exact command or evidence>

Risk or notes:
<rollback, limitation, dependency, or None>
```

The squash body is a durable engineering record. Condense discussion, remove abandoned alternatives, and do not copy unresolved review conversation into `main` history. The final commit must not be named after a roadmap phase, task packet, screenshot, tool version, or temporary branch.

## 6. Merge and cleanup contract

A PR is ready for squash merge only when:

- the PR has the required review state for the repository;
- all conversations are resolved;
- `CI Gate` passes;
- the branch is based on an acceptable `main` state;
- the PR description records the actual verification and risks.

After squash merge:

```bash
git switch main
git pull --ff-only
git branch -d <merged-branch>
git fetch --prune
```

Use force deletion only when the branch was intentionally not merged and its changes are already preserved elsewhere. Delete the remote head branch through the hosting platform's automatic cleanup or an explicit repository command.

## 7. Scope discipline

- One PR has one dominant outcome.
- A coherent change may touch multiple files and layers.
- Do not mix unrelated cleanup into a delivery merely to reduce PR count.
- Update affected Evidence Mode or Decision Mode documentation in the same delivery.
- Keep implementation details in the PR body only when they explain verification, risk, or a meaningful design choice.
