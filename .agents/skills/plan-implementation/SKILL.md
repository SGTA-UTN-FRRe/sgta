---
name: plan-implementation
description: Use when the user asks to plan the implementation of a roadmap item, phase, milestone, feature, refactor, redesign, migration, or other multi-step engineering outcome. Inspect current repository reality and relevant decision documents, then produce a decision-complete implementation plan without leaking planning labels into delivery artifacts.
---

# Plan Implementation

Use this skill to turn approved roadmap or product intent into an implementation-ready plan.

## Core contract

- Planning and implementation are separate steps.
- Inspect current repository reality before decomposing work.
- Treat the roadmap as target-state guidance, not evidence that code already exists.
- Read only the documents and code boundaries relevant to the requested outcome.
- Preserve approved product, architecture, design, and testing decisions.
- Do not invent business rules, APIs, data models, or runtime capabilities.
- Do not create branches, commits, PRs, or merge text unless the user explicitly asks. When delivery artifacts are requested, use `$git-delivery`.
- Roadmap labels and numbers may be referenced while reading or addressing the plan, but generated implementation filenames and delivery artifacts should use the durable outcome rather than planning labels.

## Read order

Always inspect:

1. root `AGENTS.md`;
2. the requested roadmap item or target statement;
3. current source, tests, manifests, and configuration for the affected boundaries.

Read when relevant:

- `PROJECT.md` for product boundaries;
- `ARCHITECTURE.md` for system boundaries and invariants;
- `PROJECT-DESIGN.md` and `UI-SPEC.md` for UI work;
- `TESTING.md` and CI for verification work;
- `DEVELOPMENT.md` for current development conventions;
- deployment or integration documentation when the outcome touches those boundaries.

Do not load broad research or unrelated docs when narrower approved specifications are available.

## Reconcile target with reality

Before planning tasks, determine:

- what already exists;
- what is missing;
- what must be changed rather than added;
- dependencies and ordering constraints;
- relevant tests and verification gates;
- documentation that must become true after implementation.

If current code contradicts an approved target, plan the transformation explicitly.

If authoritative documents conflict with each other in a way that changes product behavior or data safety, surface the conflict instead of silently choosing a new rule.

## Decide whether a written plan is useful

Create a written execution plan when the outcome crosses multiple boundaries, requires ordering, or is too large for one obvious delivery.

Typical reasons:

- multiple routes or workflows;
- schema or migrations;
- auth or authorization;
- external integrations;
- broad UI propagation;
- CI architecture;
- transactional behavior;
- several coherent deliveries.

For a small, obvious, low-risk outcome, a short in-chat plan is enough unless the user requested a file.

## Plan filename

When a local execution directory exists, prefer:

```text
local-docs/execution/<outcome-slug>.md
```

Example:

```text
local-docs/execution/golden-screens.md
```

Do not generate filenames such as `PHASE-03.md`, `phase-3-plan.md`, or task-number filenames unless the user explicitly requests that convention.

## Required plan structure

Use this structure and delete sections that do not apply:

```md
# <Outcome> implementation plan

## Outcome

## Current state

## Scope

## Non-goals

## Execution order

### Task 1 - <Concrete outcome>

#### Goal

#### Changes

#### Acceptance criteria

#### Verification

#### Documentation sync

### Task 2 - <Concrete outcome>

...

## Completion criteria
```

Task numbers are local addressing coordinates for execution prompts. They may be used to identify work such as `Task 2`, but they are not delivery names and must not be copied into branches, commits, PRs, squash messages, filenames, or identifiers.

## Queue-ready task design

Plans should support sequential execution prompts without requiring the agent to reinterpret scope each time.

Each task must be sufficiently self-contained that a later prompt can say:

```text
Implement Task 2. Commit the changes.
```

and the agent can determine exactly what belongs to that task from the plan and current repository state.

For each task:

- state concrete changes rather than vague intentions;
- state predecessor dependencies when they exist;
- state observable acceptance criteria;
- state task-specific verification;
- state any documentation sync caused by the task;
- avoid overlapping ownership with later tasks unless the dependency is explicit;
- size the task so it can reasonably form one cohesive commit when the user requests task-by-task commits.

The final task does not need special plan content merely because the user may later request `open a PR`; PR creation is a delivery action owned by `$git-delivery` after the branch is complete.

## Task sizing

Each task should:

- have one dominant outcome;
- be independently understandable;
- have clear acceptance criteria;
- be independently verifiable;
- form a coherent implementation/delivery unit;
- avoid unrelated cleanup.

Do not split work merely by file count.

Prefer outcome wording such as:

```text
Add tutor create and edit workflow
Enforce server-side role authorization
Build responsive hour movement dialog
Add deterministic real-stack browser proof
```

Avoid planning-container wording such as:

```text
Complete the next phase
Implement task 4
Finish the backend
Do the remaining UI
```

## Verification planning

For each task, state the smallest useful verification boundary first, then broader repository checks when appropriate.

Do not claim that checks passed during planning.

For meaningful UI work, include visual verification across the viewports and states defined by the project's UI specification.

## Documentation sync

Distinguish target-state docs from evidence/current-state docs.

Plan updates to current-state documentation only when implementation makes a new fact true.

Do not create a second specification when an existing approved document already owns the decision.

## Final check

Before finalizing the plan, verify:

- it reflects current code reality;
- tasks are ordered by real dependencies;
- every task has a concrete outcome and acceptance criteria;
- every task is executable from a later queued prompt without re-planning;
- task boundaries can map cleanly to cohesive commits when requested;
- no unrelated scope was added;
- planning identifiers did not leak into generated delivery names;
- the plan does not duplicate an existing source of truth.
