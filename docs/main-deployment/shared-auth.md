# Shared accounts with separate applications and databases

## The user experience

1. A visitor opens Meal Planner, Books or an authenticated Anatomy/Blog feature.
2. That app sends the visitor to the main Vetify sign-in screen.
3. Main authenticates using the password or a previously linked social provider.
   If the main session is already valid, the user can continue without entering
   their credentials again, subject to consent and any required security checks.
4. Main returns a short-lived, single-use authorization code to the registered app.
5. The app exchanges it securely and creates its own session. The shared identity
   is the immutable main user ID, not the name or email address.
6. The feature stores only its own data with that user ID as the owner reference.

Signup started from any app must create the account through main authentication.
The existing signup code expires in five minutes, resend waits sixty seconds,
and replacing a code invalidates the previous one. Do not create a second users
collection or a separate password/provider database in a subsystem.

An existing Google account still requires explicit linking before password,
Facebook or TikTok login can access it. The subsystem must not merge identities
by matching an email address. Main owns those linking checks and verification.

## Existing implementation versus required additions

Main already has browser authentication, native authentication/session handoff,
linked login methods and `POST /api/v1/auth/introspect`.
Introspection returns user ID, role/status, subscription, region and a validity
window capped at thirty seconds. It checks an attached native session.

An optional Anatomy OIDC provider is now implemented separately at `/api/oidc`.
See [Anatomy OIDC setup and release checks](anatomy-oidc.md). It must be configured,
reviewed and jointly verified before production use.

The existing `vetify-meal-planner` repository now requires introspection version 2;
main still returns version 1. Its version 2 contract requires a verified issuer,
Planner audience and provider/email-verification attributes. Align main and
Planner configuration and run joint tests before declaring compatibility.
Preserve existing browser/native flows while adding this versioned boundary.

This does **not** establish a complete web SSO protocol for four external apps.
In particular, the current introspection payload does not expose professional
approval or email verification, and the guard does not enforce a distinct
subsystem audience/issuer or current browser session version.
Implement and test the additions below in main before relying on them.
Do not advertise proposed endpoints as already available.

## Required main authentication work

- Register each client with exact allowed callback/logout URLs. Use separate
  localhost and production registrations. Reject arbitrary return destinations.
- Use Authorization Code with PKCE, unpredictable state, short code expiry and
  atomic single use. Prefer a maintained OAuth/OIDC implementation over a new
  homegrown protocol. Document how the current main identity store integrates.
- Bind each code to client, callback and PKCE challenge. A code for Books cannot
  be redeemed by Blog, including when requests run concurrently.
- Issue credentials scoped to the client/audience. Do not distribute the main
  `JWT_SECRET_ACCESS`, refresh-cookie secret, social credentials or Mongo URI.
- For server-backed apps, store sensitive credentials server-side and use a
  Secure, HttpOnly session cookie. Never place access tokens in callback URLs.
- Validate expiry, active account, verified email and current session version.
  Honor bans, deactivation, password changes and session revocation promptly.
- Define whether logout is local or global and make that distinction visible.
  Global logout must invalidate all applicable subsystem sessions.
- Provide server-side introspection or asymmetric token verification plus an
  online revocation check. Use no-store responses and bounded caching.
- Expose verified professional capability for Books uploads and main admin
  authority for Blog moderation. A role string alone is insufficient for Books.
- Return only approved identity attributes. Profile display names can change;
  ownership IDs cannot. Never grant authority from client-supplied attributes.
- Define account deletion/export integration with each feature. Preserve shared
  identity references while export/deletion requests are being coordinated.
- Apply persistent abuse limits. A Lambda-local counter cannot coordinate
  concurrent instances; verification cooldowns and grants need atomic storage.

## Each subsystem must enforce

- Authenticate and authorize every protected API request on the server.
- Restrict data reads/writes to the current main user ID, unless an explicitly
  permitted moderator or administrator operation requires broader access.
- Reject unknown audiences, wrong issuer, expired credentials, revoked sessions
  and disabled/unverified accounts. Fail closed when authentication is unavailable.
- Keep its Mongo user scoped to its own database. Never connect to main collections.
- Keep cookies scoped to its own host; do not solve SSO with a broad `.vetify.page`
  cookie or cross-app localStorage access. Configure exact HTTPS CORS origins.
- Recheck privileges for uploads, moderation, affiliate access and other sensitive
  writes. Do not trust cached UI state for authorization.
- Do not treat an externally supplied email as proof that an account exists.

## Required messages and acceptance cases

For a genuinely unknown account, show:
`Create an account first to use the app.`
For signup using an already registered identity, show:
`Account already exist. Please login`
These decisions come from main, which knows all registered login methods.

Test password signup in main then login from a feature, and signup initiated
from a feature then login in main. Test Google plus explicitly linked password,
an unlinked provider collision, expired/wrong/replayed codes, expired tokens,
PKCE and callback tampering, disabled accounts, revoked sessions and global logout.
Test that another user's ID, changed email or promoted client-side role cannot
grant access. Test that removing a professional approval blocks Books uploads.

Protocol reference: [OAuth security best practice, RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html).
