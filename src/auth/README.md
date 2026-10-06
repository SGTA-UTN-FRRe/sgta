# Authentication and authorization

Server-side authentication, session helpers, and authorization guards belong in this directory. Keep role checks out of client-only code.

`auth-client.ts` exports the shared client-only Better Auth browser client used
by login and sign-out controls. Session validation and role decisions remain
server-side.
