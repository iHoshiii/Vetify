# Prompt: initialize the separate Anatomy repository

Paste everything below into the coding agent in `vetify-anatomy`.

---

Port the existing Vetify Anatomy viewer to its own React/TypeScript/Vite repository.
Preserve the existing diagrams, interaction and responsive UI. Main source is
`C:\Users\Administrator\OneDrive\Desktop\Vetify`.
Read feature source without changing main, copying `.env` or credentials,
deploying resources or inventing unavailable images. Ask for a source export
if the implementation cannot be accessed.

## Source to port

- `src/client/pages/anatomy/`, including `_components/` and animal hotspot data.
- `src/client/types/anatomy.ts` and shared UI helpers actually used by the viewer.
- `public/anatomy/` diagrams with their current paths and credits/licensing.
- Necessary CSS styles and useful existing viewer tests, if any.

Current Anatomy is a frontend/static feature. It has dog, cat and bird selections,
body-system selections, hotspots and zoom controls. Do not claim existing motion
gestures, a 3D engine, an Anatomy backend or database. Add new interactions only
when requested separately. Preserve pointer/touch/keyboard behavior that exists.

Main's MediaPipe face detection is used for professional proof. Do not move or
remove that main capability just because Anatomy is being separated. Anatomy
does not inherit professional onboarding, webcam proof or its server APIs.

## Hosting and access

Prefer a static build on private S3 plus CloudFront. There is no feature database
required initially. Large image assets should load progressively; show a proper
loading/error state and keep hotspots aligned during zoom/resizing.
Use the shared Vetify logo and maintain a clear link back to main.
The proposed production address is `https://anatomy.vetify.page`.

The current main route requires authentication. Follow main
`docs/main-deployment/shared-auth.md` to preserve that policy. Web SSO additions
must be implemented in main before claiming cross-app login works. Do not create
an independent signup/password/social identity store or expose main JWT secrets.

Decide and document whether diagrams are protected content or only the viewer
requires sign-in. Static assets are downloadable if hosted publicly through the
distribution even when React hides its route. If assets must be private, use an
authenticated delivery design and test direct access; do not promise protection
from a client-side route guard. A small auth backend may be needed for that policy.
Stop and identify the decision if the owner has not specified content privacy.

## Configuration and commands

Supply a lockfile and npm dev/build/preview/test commands. Use the existing
frontend technology and avoid unnecessary server or database dependencies.
Create a sample with placeholders and implement these settings:

```dotenv
VITE_MAIN_ORIGIN=http://localhost:5173
VITE_AUTH_CLIENT_ID=vetify-anatomy
VITE_AUTH_CALLBACK_URL=http://localhost:5176/auth/callback
```

Use port 5176 for local UI. Production callback is
`https://anatomy.vetify.page/auth/callback`, registered with main.
These are public values, not credentials. Any auth backend needs its own private
configuration. Do not put tokens, client secrets or MongoDB URIs in VITE settings.
Use Authorization Code with PKCE and no token in callback URLs.

## Acceptance

1. Produce a source/asset manifest and preserve existing content and attribution.
2. Verify all animals/body systems, hotspot descriptions and zoom ranges.
3. Test pointer hover, accessible focus, usable touch interaction and responsive
   resizing, including hotspot alignment on narrow screens.
4. Test slow and failed image loads, deep links, refresh on nested routes and
   configured back-to-main navigation.
5. Test login/logout/revocation according to the agreed shared-auth policy.
   Label any temporary auth stub explicitly and do not call it production ready.
6. Verify no planner, Books, Blog, webcam-proof or main realtime dependencies
   enter the feature build. Inventory the static output size.
7. Document content access policy, local setup, production hosting and results.

Main will keep a launch link rather than bundle this viewer or its diagram assets.
