# Main launch acceptance and monitoring

Reviewed 25 October 2026. Run these checks against the intended deployed revision.
Local test results and a healthy homepage are separate evidence.

## Browser checks on https://vetify.page

1. Refresh nested main routes. Confirm assets, logo and available skeletons load.
2. Visit a nonexistent API route. It must return JSON 404, not the SPA homepage.
3. Confirm `/planner` shows the public app page with its download QR, six highlights
   and account guidance. Confirm Books, Anatomy and Blog show configured external
   launch or unavailable states. No missing modules or broken destination links.
4. Sign up a test account through main. Receive a six-digit email code, wait
   sixty seconds before resend, expire it at five minutes and reject the old
   code after resend. Confirm unverified access restrictions.
5. Test unknown-account login, duplicate signup, wrong password, password reset
   and a session refresh. Verify real inbox delivery, not only provider acceptance.
6. Sign in with each enabled social provider. Test linked and unlinked matching
   emails; account names and professional approval must survive login/signup.
7. Test sign out after scrolling, multiple tabs, expired/revoked sessions,
   blocked/deactivated accounts and settings/account export.
8. Test main professional application image upload, admin approval, profile
   visibility and appointment booking with a designated test professional.
9. Confirm reminders, appointment completion and mail retries run without an
   open browser or a persistent Node process. Check the durable worker logs.
10. Test two-user messages and notifications, reconnect, temporary offline,
    session renewal and logout cleanup through API Gateway WebSockets.
11. Test scheduled video calls with two devices on different networks, including
    a network requiring TURN. Verify camera/audio, mute, reconnect and hang-up.
12. Confirm main admin metrics render while all four feature apps are offline.
    Empty main collections must not cause a crash.
13. Verify professional/owner uploads are private and unauthorized downloads fail.
    Confirm private proof photos stay in MongoDB and are absent from frontend S3.
14. Greet Kupa and ask its name. Test short/long pet-care and anatomy questions,
    contextual follow-ups, unrelated questions, and pet-themed programming requests.
    Check urgent escalation, anonymous allowances, signed-in activity, and handled
    provider failures. Use the [live fixture suite](bedrock-chat.md) as additional evidence.
15. If enabled, test Anatomy/Books OIDC with their exact callbacks, both logout
    modes, revoked sessions, and client isolation. Test Books approval revocation
    separately from sign-in. Do not assume native Planner v2 compatibility.

Use isolated test accounts/data and remove deliberate test bookings through the
normal app controls. Do not run bulk seed/reset scripts against production.

## Package and ownership checks

- No Books PDF worker/library in main Lambda. No feature route import roots.
- No Anatomy assets in main S3 release. Retain needed main MediaPipe assets.
- Main MongoDB credentials access only main's selected database.
- No writes/initialization to subsystem collections in main startup or routes.
- No real environment files, keys or source archives in deployment artifacts.
- Main identity/session/approval IDs are preserved. No email-based account merge.

Feature extraction is implemented. Validate the actual packaged release against
these assertions; focused auth/realtime checks alone do not validate the split.
Resolve or explicitly assess current test failures and remaining dependency
advisories before claiming readiness. See the [cleanup audit](repository-cleanup-audit.md).

## Monitoring and cost checks

In CloudWatch, inspect the stack's Lambda logs. The existing template uses
seven-day retention. Never log tokens, codes, passwords or private upload data.
Watch Errors, Throttles and Duration for Lambdas, HTTP API 4xx/5xx/latency,
WebSocket connection/message errors, worker failures and MongoDB connectivity.
Set useful alarms with your alert email. Test that the alerts arrive.

In Billing, review actual usage cost, remaining credits and their expiry weekly.
Budget alerts do not stop resources. API Gateway connection minutes accumulate
while browser sockets remain connected, even if no chat message is sent.
See [API Gateway pricing](https://aws.amazon.com/api-gateway/pricing/).

Main infrastructure is S3/CloudFront, HTTP and WebSocket API Gateway, Lambda,
CloudWatch, Secrets Manager, optional Route 53 and private upload storage/workers.
Bedrock adds token charges to AWS usage. MongoDB, Resend and TURN have separate limits/costs.
No EC2, Fargate, load balancer or NAT is required by the basic public architecture;
a later private database networking decision can change that cost picture.

## Later feature launches

Use each existing repository's local documentation. Coordinate Planner's version
2 introspection requirement with main. Configure and jointly validate implemented
Anatomy/Books OIDC and Books worker capabilities. Blog registration and admin
integration remain separate work. Validate account reuse before enabling links.
Create that feature's own hosting, database/storage and callback registration.
Do not automatically deploy all four with main's stack or share MongoDB users.
Enable a main launch link only after its destination and auth integration work.
