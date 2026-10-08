# SGTA - Deployment

> Presentation topology, configuration, release flow, and rollback boundaries.

## Presentation topology

The repository contains Vercel configuration for the presentation environment.
The planned production cutover and its operational data migration remain
deferred. Provider credentials and account settings are managed outside Git.

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
| Application database | Neon | The presentation runbook uses the `sgta` project's `staging` branch in `sa-east-1`; the app uses a pooled connection and operator migrations use the direct connection to the same branch. |
| Sign-in | Google OAuth through Better Auth | Accepts only enabled identities provisioned in SGTA. Public sign-up is disabled. |
| Consultation source | Google Sheets | Read-only input to Admin import and review; the application does not write to the source. |
| Verification | GitHub Actions | Runs the CI workflow for pull requests to `main` and pushes to `main`; the workflow does not deploy the application. |

The existing operator notes identify the Vercel project as `sgta-tutorias` and
`https://sgta-tutorias.vercel.app` as the presentation URL. Project wiring and
deployment readiness are external settings and are not represented in this
repository. The presentation database is the Neon `staging` branch; do not treat
it as the eventual production database.

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

The repository runbook uses `main` as the Vercel Production branch. Vercel
branch settings are external to Git and must be checked in the provider console.

## Vercel application

- **Config:** [`vercel.json`](../vercel.json)
- **Install:** `corepack pnpm install --frozen-lockfile`
- **Build:** `corepack pnpm build`
- **Runtime:** Vercel's Next.js runtime in `gru1`
- **Validation:** verify the public route, protected redirects, and provisioned sign-in after deployment.

## Production configuration

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
| `GOOGLE_SHEETS_RANGE` | Consultation import | Range including the header row, currently `Respuestas!A:I`. |
| `GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL` | Consultation import | Reader service account with Viewer access to the selected copy. |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Consultation import | Server-only service account key; encode line breaks as `\n` when required by the provider. |
| `GOOGLE_SHEETS_HEADER_MAP` | Consultation import | JSON mapping for the exact headers in the selected copy. |

Leave `SGTA_E2E_MODE`, `SGTA_E2E_CONSULTATION_SOURCE_URL`, and
`TEST_DATABASE_URL` unset in deployed environments. The local test harness sets
its own isolated database and loopback source configuration.

## Google access

The presentation runbook keeps the OAuth consent screen in Testing and limits
access to the approved presenter and demo accounts. Configure the web client's
redirect URI as
`https://sgta-tutorias.vercel.app/api/auth/callback/google` when that is the
selected application URL. Request only OpenID, email, and profile scopes.

Enable the Google Sheets API and use a team-owned copy with a `Respuestas` tab.
Share the copy with the import service account as Viewer. Do not sort, delete,
or move source rows because consultation identity includes its source row.

## Database migrations and initial data

Migrations are separate operator commands, not a build step. The repository
contains forward SQL migrations and no automated down-migration or database
rollback command. Correct an applied schema change with a reviewed forward
migration; restoring application code does not restore database state.

The initial registry package and expected verification counts stay under
`local-docs/`. Run `corepack pnpm data:import --dry-run` before
`corepack pnpm data:import --apply --yes` against the intended database. Use
`corepack pnpm data:verify --expected=local-docs/execution/initial-data-expectations.json`
to compare aggregate counts when that private expectations file exists. The
verification uses a read-only transaction and does not print Tutor identities
or individual balances.

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
