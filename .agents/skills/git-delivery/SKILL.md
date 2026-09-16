---
name: git-delivery
description: Use whenever the user asks to create, name, draft, or prepare Git delivery artifacts such as branches, commits, pull requests, or squash merge messages. Enforce the repository's English delivery language, outcome-oriented naming, exact PR structure, and roadmap-metadata boundary.
---

# Git Delivery

Use this skill for branch names or creation, commit messages or creation, pull request titles or bodies, and squash merge titles or bodies.

## Core contract

- Write all Git delivery artifacts in English.
- Describe the durable engineering or product outcome.
- Treat roadmap labels, phase numbers, task packet numbers, and milestone labels as planning metadata only.
- Never copy planning metadata into branch names, commit subjects, PR titles, PR bodies, squash titles, or squash bodies.
- In particular, never generate the word `phase` in repository-facing delivery text.
- The product UI language is independent from Git delivery language.
- Do not invent verification, behavior, metrics, issue numbers, or affected areas.
- Perform Git or GitHub mutations only when the user explicitly asks for the action. Otherwise return text only.

## Delivery lifecycle

For a multi-task implementation plan, use one outcome branch for the complete coherent delivery unless the user explicitly requests a different split:

```text
base branch
→ outcome branch
→ task 1 commit
→ task 2 commit
→ task N commit
→ pull request
→ squash merge
```

Do not create a new branch merely because execution moved to the next numbered task.

Queued task prompts should continue on the existing outcome branch when it is the branch created for that implementation plan.

## Derive the delivery outcome

When the request references a roadmap item:

1. Read the requested roadmap item when available.
2. Extract the durable implementation outcome.
3. Discard the roadmap container and numbering.
4. Generate delivery artifacts from the implementation outcome only.

Example transformation:

```text
Input context: roadmap item about improving patient filters
Durable outcome: improve patient filters
Branch: feat/patient-filters
PR title: feat: improve patient filters
```

## Change types

Use the smallest accurate Conventional Commit type:

- `feat` — new product capability
- `fix` — incorrect behavior or regression
- `refactor` — structural change without intended behavior change
- `perf` — performance improvement
- `test` — test-only change
- `docs` — documentation-only change
- `ci` — CI/CD or GitHub Actions
- `build` — build, packaging, or dependency infrastructure
- `chore` — repository maintenance with no better type
- `revert` — revert of a previous change

Use an optional scope only when it materially improves clarity.

## Branch

Format:

```text
<type>/<short-kebab-case-outcome>
```

Rules:

- lowercase;
- concise kebab-case;
- outcome-oriented;
- no planning labels or numbering;
- no personal initials;
- no temporary implementation wording.

Examples:

```text
feat/patient-filters
fix/auth-return-path
refactor/session-service
ci/stable-gate
```

When explicitly asked to create the branch, create it from the requested base or from the repository's normal base branch after deriving the name.

If the current branch is already the correct outcome branch for the active plan, continue using it instead of creating another branch for the next task.

## Commit

Subject format:

```text
<type>(<optional-scope>): <imperative summary>
```

Rules:

- English;
- imperative wording;
- lowercase after the colon;
- no trailing period;
- concise, preferably 72 characters or fewer;
- one cohesive outcome per commit;
- no roadmap, phase, milestone, or task numbering.

When explicitly asked to commit changes:

1. inspect the current diff;
2. ensure the diff belongs to the requested task or cohesive outcome;
3. do not stage unrelated leftover changes;
4. derive the subject from the actual durable change;
5. create the commit only after the requested implementation verification has completed successfully or any known limitation has been surfaced according to the implementation workflow.

A task coordinate such as `Task 2` may identify what to inspect, but it must not appear in the commit subject merely because it identified the task.

## Pull request

Title format:

```text
<type>(<optional-scope>): <final outcome>
```

Body format is exact:

```md
## Summary

- <concise outcome or reason>
- <optional second summary bullet>

## Changes

- <meaningful final change>
- <meaningful final change>
```

PR rules:

- Use exactly `Summary` and `Changes`, in that order.
- Every content line under both sections is a hyphen bullet.
- Do not add `Verification`, `Testing`, `Test plan`, `Risk`, `Notes`, `Checklist`, `Screenshots`, or any other section unless the user explicitly requests it for that PR.
- Do not list every touched file.
- Do not repeat the title as a bullet.
- Keep the body concise and factual.

When explicitly asked to open the PR:

1. confirm the branch contains the intended completed delivery;
2. inspect the full branch diff against the requested or normal base branch;
3. derive the PR from the complete branch outcome, not only the most recent commit;
4. use the repository's normal base branch unless another base is requested.

## Squash merge

Squash title:

```text
<type>(<optional-scope>): <final outcome>
```

Use the final PR title when available.

Squash body format is exact:

```text
- <durable final change>
- <durable final change>
- <durable final change>
```

Squash rules:

- hyphen bullets only;
- no headings;
- no paragraphs;
- no verification section;
- no checklist;
- no review discussion;
- no planning metadata;
- keep only information worth preserving in `main` history.

## Final check

Before returning or creating an artifact, verify:

- English delivery language;
- no `phase` or roadmap numbering leaked into repository-facing text;
- correct type and optional scope;
- exact requested output shape;
- no unrequested sections;
- no invented facts;
- queued tasks remain on the intended outcome branch unless a new delivery was explicitly requested.
