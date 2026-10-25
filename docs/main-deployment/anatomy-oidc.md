# Anatomy and Books shared sign-in

Reviewed 25 October 2026 against `src/server/oidc/` and the SAM template.

## Implementation and release status

Main now includes an optional `oidc-provider` integration at `/api/oidc`, with
Mongo-backed grants, sixty-second single-use codes, required S256 PKCE, signed
RS256 identity tokens, introspection and revocation. Existing main browser,
social, signup and native authentication remain the account authority.
This document describes the implementation, not a completed production release.

The provider uses confidential clients with `client_secret_post`:

| Client           | Production callback                         | Local callback                        | Configuration                     |
| ---------------- | ------------------------------------------- | ------------------------------------- | --------------------------------- |
| `vetify-anatomy` | `https://anatomy.vetify.page/auth/callback` | `http://localhost:5176/auth/callback` | Required when provider is enabled |
| `vetify-books`   | `https://books.vetify.page/auth/callback`   | `http://localhost:5175/auth/callback` | Optional independent Books secret |

An HTTPS issuer registers only the production callbacks. A loopback development
issuer registers only the local callbacks. Each environment and client needs
independent credentials. There is no public client-registration endpoint.

Discovery is at `<issuer>/.well-known/openid-configuration`. The published
authorization, token, JWKS, introspection and revocation URLs are authoritative.
With the production main origin, the issuer is `https://vetify.page/api/oidc`.
Main pins generated URLs to its configured public issuer behind AWS proxies.

## Credentials and AWS configuration

1. Run `npm run auth:oidc:secrets`. This creates the ignored file
   `.tmp/shared-auth-secrets.json` with an independent Anatomy secret, cookie
   signing keys and a private RSA JWKS. It refuses to overwrite existing keys
   and does not print credentials. Keep the file private.
2. Merge those three fields into the existing AWS Secrets Manager application
   secret, preserving all other fields. `OIDC_COOKIE_KEYS` and `OIDC_JWKS` are
   JSON-encoded **strings**, as generated. Never give either to Anatomy.
3. Review the branch, run the checks below, then deploy the existing frontend
   and backend with SAM parameter `SharedAuthEnabled=true`. Its default is
   `false`, so an ordinary deployment does not require new secrets. The enabled
   template sets `OIDC_ISSUER` from `ClientOrigin` and injects the three secrets.
   Increment `ConfigRevision` when rotating injected secrets.
4. Check public discovery and perform the joint acceptance cases below.
5. In Anatomy's Vercel server environment, set
   `OIDC_ISSUER=https://vetify.page/api/oidc` and set `OIDC_CLIENT_SECRET` to the
   generated **OIDC_ANATOMY_CLIENT_SECRET** value. Keep Anatomy's own session
   encryption key separate. Redeploy Anatomy after main is verified.

For Books sign-in, independently generate an `OIDC_BOOKS_CLIENT_SECRET` of at
least 32 characters. The current generator does not create this optional field.
Store it in main's application secret and Books' server environment. Never reuse
the Anatomy secret. Deploy main with both `SharedAuthEnabled=true` and
`BooksSharedAuthEnabled=true`; the latter defaults to false. Keep Books' client
ID `vetify-books`, callback, issuer, and server configuration aligned. This flag
is separate from `BooksCapabilitiesEnabled`, which controls worker approval.

For development, inject the four required environment names into the server process
using fresh development credentials. Set `OIDC_ISSUER` to the origin of
`SERVER_URL` plus `/api/oidc`, for example `http://localhost:8000/api/oidc`.
An unset configuration leaves the provider disabled. Partial configuration,
an issuer mismatch, nonlocal HTTP or invalid signing keys fail startup without
printing secret values. Keep the main refresh cookie host-only.
Add the optional Books secret only when testing that registered client.

## Sign-in and logout behavior

The provider sends a five-minute interaction to `/auth/shared`. The page checks
the main refresh cookie, sends anonymous users to existing login/signup, and
returns after password/social sign-in or email verification, then automatically
continues for a verified active session. Sign-in shares the
immutable account ID and verified email with the registered app. Completion
requires the provider's signed interaction cookie and the exact main UI Origin.

Feature-local logout revokes only that feature's access token. Main's normal
logout revokes its current browser session and every shared-app grant linked to
that session. The shared sign-in page also offers **Sign out of Vetify
everywhere**, backed by `POST /api/v1/auth/logout-all`. This requires the current
browser session and exact UI Origin, increments the account session version,
revokes old refresh tokens and disconnects old realtime sessions.

Each grant records the stable originating refresh-token document ID, user ID,
session version and an expiry bounded to one hour or browser-session expiry.
Normal cookie rotation preserves the document ID. Introspection and code
exchange reread the binding, account and browser session. Logout, revocation,
password changes, disabled/deleted accounts and unverified email fail closed.
Introspection only serves the token's own client, with the exact issuer,
`aud` matching `vetify-anatomy` or `vetify-books`, `client_id`, immutable `sub`, future `exp`,
`email_verified: true` and `account_active: true`. Responses use `no-store`.
No identity result is cached. Each app must continue checking protected requests
against the active main session. Tokens and grants remain isolated by client.

## Validation before release

Run `npm run test:server -- src/server/oidc/__tests__`, the existing auth route
tests, client auth tests, lint, server/client type checks and Lambda build/smoke
checks. The provider tests use a real ephemeral MongoDB and `openid-client`,
including signature verification with discovery/JWKS, state/nonce, PKCE,
callback/client tampering, code expiry/replay/concurrent exchange, and live
account/session revocation.

Before production release, jointly test both deployed applications: main
password signup, signup initiated from Anatomy, Google and explicitly linked
password login, unlinked-provider collisions, both logout modes, expired main
sessions, disabled accounts, password reset, provider outages and direct access
to protected Anatomy pictures. Local protocol tests do not establish that AWS
and Vercel credentials, proxies, cookies and deployed UI versions are aligned.

Meal Planner's version 2 boundary, Blog registration, and cross-app account
export/deletion orchestration remain separate work. Books worker approval uses
the [separate capability endpoint](books-capabilities.md), not OIDC identity alone.
