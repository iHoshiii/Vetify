# Shared accounts and independent applications

Reviewed 27 October 2026. Main is the account authority. Each feature app owns its
feature data and app session, identified by the immutable main user ID.

## Current contracts

| Interface                        | Implementation                                                                 | Boundary                                              |
| -------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Main browser auth                | Password/social login, verification, explicit linking, rotating refresh cookie | Main host only                                        |
| Native handoff and introspection | `POST /api/v1/auth/introspect`, version 1                                      | Existing native registration and session checks       |
| Shared web sign-in               | Optional OIDC provider at `/api/oidc`                                          | Anatomy; Books only when independently configured     |
| Books worker approval            | `POST /api/v1/auth/books-capabilities`, version 2                              | Expiring service credential, current author approval  |
| Blog sign-in                     | Optional confidential `vetify-blog` client and `/api/oidc/blog-capabilities`   | Current token-bound account/professional/admin access |

These version numbers belong to different contracts. Books capability version 2
does not make native introspection compatible with Planner v2.

## Browser sign-in

1. The feature starts Authorization Code sign-in using its registered client,
   exact callback, state, nonce, and S256 PKCE.
2. Main authenticates through its existing login/signup flow. A valid verified
   main browser session can continue without entering credentials again.
3. Main issues a short-lived single-use code bound to the client and callback.
4. The feature backend exchanges the code and establishes its own session.
5. Protected feature requests check the current identity and revocation contract.

The provider supports Anatomy and independent optional Books and Blog registrations. Credentials
and callbacks are separate; a token for one client cannot authorize the other.
See [provider setup, flags, and joint tests](anatomy-oidc.md).

Main signup uses six-digit email codes, five-minute expiry, and sixty-second
resend cooldown. A replacement invalidates the previous code. Matching email
addresses do not link login methods. Users prove ownership through main's
existing explicit linking flow.

Main logout revokes grants bound to that browser session. Global logout
invalidates all main browser sessions and their bound grants. Feature-local
logout revokes that feature's token without ending other sessions.

## Native Planner boundary

Native introspection returns identity, current status, subscription, region,
token expiry, and a validity window capped at thirty seconds. An attached native
session must still be active.

Main currently returns version 1. Planner's documented v2 requirements include
issuer/audience and provider/email-verification attributes. Coordinate both
repositories and run joint tests before declaring compatibility. Do not use the
existing native introspection as a generic web SSO protocol.

## Books worker boundary

The [Books capability endpoint](books-capabilities.md) rereads current account
and professional approval. Its service token permits that lookup only. It does
not sign users in, require an author browser session, or replace Books' own
authorization immediately before publication.

Books must check the returned user ID, audience, active/verified state, current
professional role and approval, and validity deadline. A role string alone does
not establish verified professional authority.

## Rules for every app

- Store feature records under immutable main IDs. Do not copy passwords,
  authentication collections, main refresh tokens, or signing keys.
- Use separate least-privilege database credentials. Never access main
  collections directly.
- Authenticate and authorize protected requests server-side. Reject wrong
  clients, expired/revoked sessions, disabled accounts, and unverified email.
- Keep app cookies host-scoped and server credentials outside browser builds.
  Use exact allowed origins and callbacks.
- Recheck privileges for sensitive writes. A cached UI role is not authority.
- Define local and global logout clearly. Honor account/password/session changes.
- Coordinate account export and deletion across independently owned data.

Blog has its own registered client and token-bound capability contract; see
[Blog integration](blog-oidc.md). Account export/deletion orchestration across
apps remains separate work.

## Joint acceptance

Test main and feature-initiated signup, password and linked social login,
unlinked-provider collisions, expired/replayed codes, callback/client/PKCE
tampering, concurrent exchanges, disabled accounts, revoked sessions, password
reset, local/global logout, and provider outages. Check that one client's token
cannot introspect or authorize another client's session.

Required unknown-account and duplicate-signup messages remain:
`Create an account first to use the app.` and
`Account already exist. Please login`.

Use the provider's tests and the [live checklist](aws-acceptance.md) as separate
evidence. Local protocol tests do not prove deployed credentials and cookies align.

Protocol reference: [OAuth security best practice, RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html).
