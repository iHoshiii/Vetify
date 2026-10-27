# Blog shared sign-in

Reviewed 27 October 2026. Main remains the account authority. Blog owns its
content, moderation, sessions and independent database. No passwords, Main
refresh tokens, authentication collections or signing keys are copied.

## Registration

`vetify-blog` is an optional confidential OIDC client at `/api/oidc`, using
`client_secret_post`, RS256 identity tokens, `openid email`, state, nonce and S256
PKCE. Exact callback selection follows the issuer environment:

| Environment | Callback                                  |
| ----------- | ----------------------------------------- |
| Development | `http://localhost:5178/auth/callback`     |
| Production  | `https://blogs.vetify.page/auth/callback` |

Port 5178 avoids Anatomy's local API on 5177. Supply an independent
`OIDC_BLOG_CLIENT_SECRET` of at least 32 characters, and set that same value as
Blog's server-only `AUTH_CLIENT_SECRET`. Settings reject reuse of Books or
Anatomy credentials. Existing registrations and native introspection are unchanged.

## Permission contract

`POST /api/oidc/blog-capabilities` accepts the Blog access token as a Bearer
credential, with no caller-supplied user ID. It rejects missing/expired/other-client
tokens and rereads the bound account and originating Main browser session.

Its `{data: ...}` response has contract `version: 1`, the exact OIDC issuer,
`audience: vetify-blog`, current `user: {id,name,role,status}`, `emailVerified: true`,
optional `professional: {status}`, `tokenExpiresAt` matching token `exp`, and
`validUntil` bounded to 30 seconds and token expiry. Interview maps to pending;
suspended approval maps to revoked. Blog must match the capability owner and
expiry against authenticated OIDC introspection on each protected request.

Blog derives authoring permission from a current Main admin, or a professional
with actual verified approval. Main's `user` role maps to Blog's internal public
reader. The Blog backend enforces ownership and moderation. It rereads the acting
session and permissions after screening and before publication; permission
failure leaves automatic submissions private. Published articles are not
removed automatically when author approval changes.

## Session and logout

Main login/signup/verification/linking continue through the existing shared
sign-in flow. A valid Main browser session continues without another password.
Main binds the Blog grant to that browser session and account session version.
Normal/global logout, password changes, restrictions, deletion and revocation
invalidate subsequent protected Blog requests. Blog's local logout deletes its
own session and invokes OIDC revocation, ending that Blog grant and any tokens
sharing it. It does not end Main or other app sessions. Remote revocation
failure is explicit, while the local Blog session is still deleted.

## Deployment

1. Add the independent Blog client secret to the existing AWS application secret,
   preserving other fields. The secret generator includes this field for new
   setups and still refuses to overwrite existing generated material.
2. Deploy Main with `SharedAuthEnabled=true` and `BlogSharedAuthEnabled=true`,
   preserving Books capability/auth flags. Bump `ConfigRevision` when injected
   credentials change. The Blog flag defaults to false.
3. Configure Blog's matching client secret, independent encryption key, exact
   origin/callback and its own MongoDB replica set in Vercel. Enable Blog auth only
   after the Main deployment supports the registration and capabilities.
4. Run joint browser acceptance: active/anonymous Main sessions, signup return,
   linked social login, approval/admin changes, ownership, local/global logout,
   password/account changes, replay and cross-client attacks, provider outages.
   Confirm Books and Anatomy continue to work. Local tests do not prove deployed
   AWS/Vercel configuration or real social-provider/inbox behavior.

Run `npm run test:blog:integration` with the sibling `vetify-blogs` checkout and
its dependencies present for real-provider/client acceptance against disposable
MongoDB databases. This optional check covers seamless sign-in, destination
return, publication, approval revocation, admin demotion and both logout modes.
