# Main Vetify product requirements

Updated 14 October 2026. This document supersedes the historical Word scope for
main implementation. Technical status is in [TDD](TDD.md); deployment gates are
in [the main guide](main-deployment/README.md).

## Purpose and boundary

Main Vetify connects pet owners to veterinary guidance, verified professionals,
appointments and communications. It is the account authority for separate apps.
Meal Planner, Books, Anatomy and Blog are independently owned features; main
retains launch links and their approved authentication/capability interfaces.
Books/Anatomy are extracted, with protected launch pages remaining in main.
Planner has a public app introduction with download/photo placeholders and account
guidance; its feature code is extracted. Blog also has external launch pages, with its implementation removed from main.

## Actors

| Actor            | Main permissions                                              |
| ---------------- | ------------------------------------------------------------- |
| Visitor          | Public information and permitted anonymous AI guidance        |
| Verified account | Settings, clinic discovery, own appointments/messages         |
| Professional     | Approved professional profile and own consultation workflow   |
| Administrator    | Authorized account/application operations with audit evidence |
| External app     | Only its registered identity/capability API scope             |

Roles alone do not establish all permissions. Check current account status,
professional approval, ownership and appointment participation server-side.

## Functional requirements

### Accounts and verification

- Signup collects name, email, password and confirmation.
- Main issues a six-digit email code, expires it after five minutes, limits
  resend to once per sixty seconds and invalidates the previous code on resend.
- Protected access stays restricted until verification succeeds.
- Unknown login: `Create an account first to use the app.`
- Duplicate signup: `Account already exist. Please login`
- Wrong-password feedback should clearly identify an email/password mismatch.
- Support password recovery, session refresh, logout and account status changes.
- Matching local/social emails require explicit provider linking with ownership
  proof. Logging in must preserve the existing identity, name and approval.
- Linking/recovery must not grant authority from an unproven email alone.

Acceptance includes expired/wrong/replaced codes, cooldown/concurrent requests,
failed delivery, provider collisions, linked login and revocation across tabs.

### Professional onboarding and discovery

Collect and validate professional proof, application data, contact and clinic
location. Administrators control approval; public signup cannot overwrite it.
Keep professional identity proof separate from external educational content.
The map distinguishes verified professionals from external clinic listings.
Handle denied location, no matches, incomplete contact data and loading failures.
Production proof images require private storage and authorized access.

### Appointments, messages and calls

Support virtual/onsite appointments and valid confirmation, decline, cancellation,
completion and review transitions. Enforce slot conflicts and current parties.
Only participants may read/write a conversation or join appointment call rooms.
Provide reliable notifications, reminders and delivery retries.
Calls need clear camera/microphone/network states, reconnect and explicit hangup.
Signalling runs through API Gateway WebSockets in production; WebRTC carries media.
Test TURN-assisted calls across networks, not just local fake-media playback.

### AI Vet Assistant

Provide veterinary-scoped general guidance with clear limits and reviewed urgent
escalation. It must not represent generated text as a definitive diagnosis.
Preserve current request validation, cancellation, allowance policy, provider
failure handling and appropriate moderation. Future paid AI entitlements are a
policy/integration decision, not an assumed implemented purchase workflow.

### Settings and administration

Keep account security, login-method connections, preferences, privacy and Planner
account handoff/QR in main. Scope exports honestly after data ownership changes.
Recheck admin rights and account status on sensitive writes; record audit evidence
and preserve last-admin protections. Dashboards must work without external apps.

### Independent feature integration

Main exposes central identity and approved capabilities, not direct database
access. Use immutable main user IDs. An unavailable external app cannot block
main login, booking, messaging or administration.
External web SSO remains pending; Planner's version 2 introspection requirements
must be coordinated with main's current version 1 response.

## Quality and launch acceptance

Responsive, accessible main pages need explicit loading/error/empty/retry states.
Existing skeletons are feature-specific; initial HTML does not promise a full
homepage skeleton before JavaScript loads.
Keep secrets and sensitive documents out of frontend output/logs.
Test authorization, abuse controls, ownership, concurrent sessions and recovery.
Use private uploads, durable workers, monitoring, backup/rollback and verified
main-only package contents before deployment. Do not infer readiness from a
passing homepage or a focused subset of tests.

See [delivery plan](masterplan.md), [flows](flowchart.md) and
[extraction plan](../MIGRATION_PLAN.md) for the remaining sequence.
