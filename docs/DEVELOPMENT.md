# SGTA - Development

> Local setup, environment, and developer workflow.

## Requirements

| Tool | Version | Source |
| --- | --- | --- |
| Node.js | `>=22.0.0 <25` (Node.js 22 LTS) | `package.json` |
| Corepack and pnpm | pnpm `11.24.0` | `package.json` `packageManager` field |
| PostgreSQL | Required for persisted application and auth flows | `DATABASE_URL` in `.env.example` |
| Docker | Required for Testcontainers integration and authenticated E2E suites | `vitest.integration.config.ts`, `tests/e2e/web-server.ts` |

## Setup

```bash
corepack pnpm install --frozen-lockfile
cp .env.example .env.local
```

Edit `.env.local` with local values before migrating the database or using
protected flows. Keep secrets in that ignored file; never commit them.

## Local environment

| Variable | Required locally | Purpose |
| --- | :---: | --- |
| `DATABASE_URL` | For database-backed flows | PostgreSQL connection for the application and operator commands. |
| `BETTER_AUTH_URL` | For sign-in | Base URL for Better Auth; local default is `http://localhost:3000`. |
| `BETTER_AUTH_SECRET` | For sign-in | Server-only signing/encryption secret; use at least 32 characters. |
| `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` | For real Google sign-in | Configure both values together. Production requires both. |
| `GOOGLE_HOSTED_DOMAIN` | No | Optional Google Workspace domain restriction. |
| `GOOGLE_SHEETS_*` | No | Configure the complete server-only set to enable read-only consultation imports. |
| `TEST_DATABASE_URL` | No | Optional manual test target; integration and E2E suites create isolated databases. |

Do not expose server settings through `NEXT_PUBLIC_*`. The public login shell
can be inspected without production credentials; protected flows require a
database and valid authentication configuration.

## Run locally

Create the local schema and first Admin, then start the application:

```bash
corepack pnpm db:check
corepack pnpm db:migrate
corepack pnpm auth:bootstrap-admin -- --email=admin@example.com --name="SGTA Admin"
corepack pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The bootstrap command
creates or updates one enabled Admin; it is an operator command, not public
sign-up.

## Commands

The complete command list is maintained in [AGENTS.md](../AGENTS.md#commands).
Test boundaries and CI behavior are documented in [Testing](TESTING.md).

## Agent tooling

Repository skills are optional local tooling. They are not included in a fresh clone. Install the pinned playbook revision below when using the documented agent workflows; never overwrite an existing local customization without reviewing it.

Project build and test commands do not require an AI tool or local skills.
The source is the [engineering playbook skill collection](https://github.com/acevedo-daniel/engineering-playbook/tree/9eb3c786b844b9ed83b744658601b67b3fd7ad42/.agents/skills),
pinned to revision `9eb3c786b844b9ed83b744658601b67b3fd7ad42`.
The five directories are `apply-playbook`, `delegate-task`, `git-delivery`,
`implement-task`, and `plan-implementation`. Their `SKILL.md` files own the
procedures; this section only describes installation.

Run the following commands from the SGTA repository root with Git available.
The source clone goes under ignored `local-docs/tools/engineering-playbook`;
Codex skills go under ignored `.agents/skills/`. Download and installation are
separate steps: each refuses an existing clone or destination, respectively.
If some skills are already installed, select only missing names in the install
list. Review existing customizations separately before updating them; compare
the installed files with the pinned source and apply reviewed changes manually.
Do not delete or overwrite an existing clone or install to rerun these commands.

### PowerShell

Download the pinned source:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    $playbookPath = 'local-docs/tools/engineering-playbook'
    if (Test-Path -LiteralPath $playbookPath) { throw "Source already exists: $playbookPath" }
    New-Item -ItemType Directory -Force -Path 'local-docs/tools' | Out-Null
    git clone https://github.com/acevedo-daniel/engineering-playbook.git $playbookPath
    if ($LASTEXITCODE -ne 0) { throw 'Playbook clone failed.' }
    git -C $playbookPath checkout --detach 9eb3c786b844b9ed83b744658601b67b3fd7ad42
    if ($LASTEXITCODE -ne 0) { throw 'Pinned checkout failed.' }
}
```

Install only missing directories after verifying the checkout:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    $playbookPath = 'local-docs/tools/engineering-playbook'
    $skillRoot = '.agents/skills'
    $skillNames = @('apply-playbook', 'delegate-task', 'git-delivery', 'implement-task', 'plan-implementation')
    $playbookRevision = git -C $playbookPath rev-parse HEAD
    if ($LASTEXITCODE -ne 0 -or $playbookRevision -ne '9eb3c786b844b9ed83b744658601b67b3fd7ad42') { throw 'Pinned checkout required.' }
    foreach ($skillName in $skillNames) {
        $sourcePath = Join-Path $playbookPath ".agents/skills/$skillName"
        $destinationPath = Join-Path $skillRoot $skillName
        if (-not (Test-Path -LiteralPath "$sourcePath/SKILL.md" -PathType Leaf)) { throw "Missing source: $sourcePath" }
        if (Test-Path -LiteralPath $destinationPath) { throw "Destination already exists: $destinationPath" }
    }
    New-Item -ItemType Directory -Force -Path $skillRoot | Out-Null
    foreach ($skillName in $skillNames) {
        Copy-Item -LiteralPath (Join-Path $playbookPath ".agents/skills/$skillName") -Destination (Join-Path $skillRoot $skillName) -Recurse
    }
}
```

### POSIX shell

Download the pinned source:

```sh
(
    set -eu
    playbook_path='local-docs/tools/engineering-playbook'
    if [ -e "$playbook_path" ] || [ -L "$playbook_path" ]; then
        echo "Source already exists: $playbook_path" >&2
        exit 1
    fi
    mkdir -p local-docs/tools
    git clone https://github.com/acevedo-daniel/engineering-playbook.git "$playbook_path"
    git -C "$playbook_path" checkout --detach 9eb3c786b844b9ed83b744658601b67b3fd7ad42
)
```

Install only missing directories after verifying the checkout:

```sh
(
    set -eu
    playbook_path='local-docs/tools/engineering-playbook'
    skill_root='.agents/skills'
    skill_names='apply-playbook delegate-task git-delivery implement-task plan-implementation'
    playbook_revision=$(git -C "$playbook_path" rev-parse HEAD)
    if [ "$playbook_revision" != '9eb3c786b844b9ed83b744658601b67b3fd7ad42' ]; then
        echo 'Pinned checkout required.' >&2
        exit 1
    fi
    for skill_name in $skill_names; do
        source_path="$playbook_path/.agents/skills/$skill_name"
        destination_path="$skill_root/$skill_name"
        if [ ! -f "$source_path/SKILL.md" ]; then
            echo "Missing source: $source_path" >&2
            exit 1
        fi
        if [ -e "$destination_path" ] || [ -L "$destination_path" ]; then
            echo "Destination already exists: $destination_path" >&2
            exit 1
        fi
    done
    mkdir -p "$skill_root"
    for skill_name in $skill_names; do
        cp -R "$playbook_path/.agents/skills/$skill_name" "$skill_root/$skill_name"
    done
)
```

### Claude Code

Claude Code reads `.claude/skills/`, rather than `.agents/skills/`. Use the same
pinned source and selected directories above. Before copying, add
`/.claude/skills/` to the repository's local Git exclusion so the install stays
outside commits. From the repository root, use PowerShell:

```powershell
Add-Content -LiteralPath (git rev-parse --git-path info/exclude) -Value '/.claude/skills/'
```

Or a POSIX shell:

```sh
printf '%s\n' '/.claude/skills/' >> "$(git rev-parse --git-path info/exclude)"
```

Then run the corresponding installation block with `$skillRoot` set to
`.claude/skills` in PowerShell or `skill_root` set to `.claude/skills` in POSIX.
Reuse the pinned source clone; do not repeat the download step. The same
existing-destination checks preserve Claude's local customizations. Local
exclusions are machine-specific and are not part of a fresh clone.

## Database workflow

Use the committed migrations to bring a database to the current schema. For a
schema change, generate a migration with `corepack pnpm db:generate`, review the
generated SQL, and run `corepack pnpm db:check` before applying it with
`corepack pnpm db:migrate`. Migration commands that write require a valid
`DATABASE_URL`; generated migrations are not edited by hand.

Initial registry data is private input under `local-docs/`. Inspect an import
with `corepack pnpm data:import --dry-run` before applying it with
`corepack pnpm data:import --apply --yes`. The importer requires an explicit
database connection for writes. `corepack pnpm data:verify` can compare a
loaded package with aggregate expected counts kept under `local-docs/`.

## Related documentation

- [Project scope](PROJECT.md)
- [Architecture](ARCHITECTURE.md)
- [Deployment](DEPLOYMENT.md)
- [Testing](TESTING.md)
