@AGENTS.md

# Claude Code guidance

## Claude Code-specific behavior

- Use Claude Code's Plan Mode for complex or multi-file changes when explicit planning is useful before editing.
- Use `/memory` to inspect which `CLAUDE.md` files and imported instructions are active when context needs verification.
- Keep private, machine-specific preferences in `CLAUDE.local.md`; do not add them to this shared wrapper.
- Claude Code loads skills from `.claude/skills/` and `~/.claude/skills/`; it does not read `.agents/skills/`.
- Local skills are optional and absent from a fresh clone. Follow [Agent tooling](docs/DEVELOPMENT.md#agent-tooling) to copy the same selected pinned playbook skills into `.claude/skills/`, adding that directory to the local Git exclusion before installing. Preserve existing customizations and review updates separately.
