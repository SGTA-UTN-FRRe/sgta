# SGTA — Deployment

> Presentation topology, configuration, release flow, and rollback boundaries.

## Presentation topology

The repository contains Vercel configuration for the presentation environment.
The planned production cutover and its operational data migration remain
deferred. Provider credentials, project wiring, database branch selection, and OAuth settings
are configured in the provider console, not in Git.

```text
Browser
  -> Vercel-hosted Next.js application (region gru1)
       -> Neon PostgreSQL staging branch
       -> Google OAuth for provisioned identities
       -> Google Sheets read-only consultation import
GitHub Actions -> CI verification (no deployment job)
```

| Component | Platform | Responsibility |
| --- | --- | --- |
| SGTA application | Vercel | Hosts the Next.js application; `vercel.json` selects the Next.js framework, locked install/build commands, and region `gru1`. |
| Application database | Neon | Presentation PostgreSQL; use a pooled connection for the app and a direct connection to the same database for operator migrations. Branch and region are configured in the provider console, not in Git. |
| Sign-in | Google OAuth through Better Auth | Accepts only enabled identities provisioned in SGTA. Public sign-up is disabled. |
| Consultation source | Google Sheets | Read-only input to Admin import and review; the application does not write to the source. |
| Verification | GitHub Actions | Runs the CI workflow for pull requests to `main` and pushes to `main`; the workflow does not deploy the application. |

Verify the presentation URL, Vercel project, and Neon branch in the provider
console before release. `vercel.json` establishes repository build settings and
region; it does not prove provider wiring, deployment readiness, or database
selection. Presentation data remains separate from the eventual production data.

## Release flow

1. Review the application revision and wait for the repository CI checks to pass.
2. Load the intended Neon staging **direct** URL into the operator process as
   `DATABASE_URL`. Confirm the selected branch before writing.
3. Run `corepack pnpm db:check`, then `corepack pnpm db:migrate`. Stop if either
   command fails. The Vercel build does not apply migrations.
4. Provision the initial enabled Admin with
   `corepack pnpm auth:bootstrap-admin -- --email=admin@example.com --name="SGTA Admin"`,
   using the intended Google identity. Remove the shell's database override
   after the command.
5. Deploy the reviewed revision through the existing Vercel project, or deploy
   `main` after merge. Redeploy after changing runtime settings.
6. Confirm the deployment is ready. Check `/login`, anonymous redirects from
   `/admin` and `/tutor`, and sign-in with the provisioned Admin and Tutor
   identities. A successful build or public login page alone does not verify
   database, OAuth, or Sheets access.

The Vercel Production branch is configured in the provider console, not in Git;
confirm it points to the reviewed release branch before deployment.

## Vercel application

- **Config:** [`vercel.json`](../vercel.json)
- **Install:** `corepack pnpm install --frozen-lockfile`
- **Build:** `corepack pnpm build`
- **Runtime:** Vercel's Next.js runtime in `gru1`
- **Validation:** verify the public route, protected redirects, and provisioned sign-in after deployment.

## Presentation runtime configuration

Set application values in the Vercel Production environment. Keep Preview and
Development free of database, OAuth, and Sheets credentials. Store secret
values in the team's secret manager and provider settings, never in Git or
`NEXT_PUBLIC_*` variables.

| Variable | Component | Requirement |
| --- | --- | --- |
| `DATABASE_URL` | Application and operator commands | Use the Neon staging pooled URL for the app and the direct URL for migrations/bootstrap; both must target the same branch and database. |
| `BETTER_AUTH_URL` | Better Auth | Stable HTTPS application URL without a path. |
| `BETTER_AUTH_SECRET` | Better Auth | Server-only random secret of at least 32 characters. |
| `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` | Better Auth | Team-owned Google web OAuth client pair. |
| `GOOGLE_HOSTED_DOMAIN` | Better Auth | Optional; leave unset when personal Google accounts must be allowed. |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Consultation import | ID of the presentation copy, not the live form response sheet. |
| `GOOGLE_SHEETS_RANGE` | Consultation import | Range including the header row from the selected presentation copy. |
| `GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL` | Consultation import | Reader service account with Viewer access to the selected copy. |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Consultation import | Server-only service account key; encode line breaks as `\n` when required by the provider. |
| `GOOGLE_SHEETS_HEADER_MAP` | Consultation import | JSON mapping for the exact headers in the selected copy. |

Leave `SGTA_E2E_MODE`, `SGTA_E2E_CONSULTATION_SOURCE_URL`, and
`TEST_DATABASE_URL` unset in deployed environments. The local test harness sets
its own isolated database and loopback source configuration.

## Google access

Configure the presentation OAuth consent screen in Testing with only the approved
presenter and demo accounts. Consent mode and allowed accounts are configured in
the provider console, not in Git. Set the web client's redirect URI to
`<application-url>/api/auth/callback/google` for the selected HTTPS application
URL. Request only OpenID, email, and profile scopes.

Enable the Google Sheets API and use a team-owned copy with a `Respuestas` tab.
Share the copy with the import service account as Viewer. Do not sort, delete,
or move source rows because consultation identity includes its source row.

## Database migrations and initial data

Migrations are separate operator commands, not a build step. The repository
contains forward SQL migrations and no automated down-migration or database
rollback command. Correct an applied schema change with a reviewed forward
migration; restoring application code does not restore database state.

Keep the initial registry package and a private expectations file outside the
repository. The importer defaults to dry-run; run `corepack pnpm data:import`
before `corepack pnpm data:import --apply --yes` against the intended database.
Use `corepack pnpm data:verify --expected=<path>` to compare aggregate counts
with the private expectations file. Verification uses a read-only transaction
and does not print Tutor identities or individual balances.

Creating a Google identity does not create or link a Tutor record. Provision an
enabled Tutor identity, then link the same account email to the intended Tutor
from the Admin tutor workflow. Verify `/tutor`, `/tutor/schedule`, and
`/tutor/hours` with that identity.

## Rollback

The CI workflow and repository configuration do not define an automatic
deployment rollback. Use the provider's deployment controls only after checking
that the previous application revision is compatible with the already-applied
database schema. Database corrections use forward migrations.

## Related documentation

- [Development setup](DEVELOPMENT.md)
- [Architecture](ARCHITECTURE.md)
- [Testing](TESTING.md)
