# Vetify realtime on API Gateway WebSockets

Reviewed 25 October 2026. React is served through S3/CloudFront, HTTP through API
Gateway/Lambda, and accounts/messages through main's MongoDB database. WebRTC
carries media; TURN relays connections that cannot connect directly. This document
describes the implementation and required acceptance, not live deployment health.

## What is implemented

- `src/server/lambda/http.ts`: Express HTTP adapter with notification delivery awaited before returning.
- `src/server/lambda/websocket.ts`: `$connect`, `$disconnect`, and `$default` event handler.
- `src/server/lambda/maintenance.ts`: scheduled realtime cleanup, appointment reminders, completion and delivery retries.
- `src/server/lambda/clinic-refresh.ts`: hourly checks and awaited daily clinic cache refreshes.
- `src/server/realtime/gateway/`: Mongo-backed connection tickets, sessions, call membership, delivery and event permissions.
- `src/client/lib/gateway-socket.ts`: browser WebSocket transport preserving existing events and acknowledgements.
- `deploy/serverless/template.yaml`: SAM backend template, including management permissions and minute cleanup schedule.
- `scripts/build-lambda.mjs`: builds handlers and generates a runtime-only dependency lockfile.

Local development retains Socket.IO when VITE_REALTIME_URL is blank. Production selects the gateway transport with the stack's RealtimeUrl output.

## Connection and call flow

1. An authenticated, verified browser posts its per-tab client ID to `/api/v1/account/realtime-ticket`.
2. The server verifies the current account/session and issues a 30-second single-use ticket, storing only its hash.
3. The browser connects to the gateway URL with this opaque ticket. The access token is never put in the connection URL.
4. `$connect` checks the browser Origin, consumes the ticket, rechecks the account and stores the connection.
5. The browser sends `connection:ready` after the upgrade. Only then does the server send presence snapshots.
6. Heartbeats every 25 seconds extend a 90-second lease. Actual authorization also expires with the access token.
7. Every action checks the account/session version and email verification. Renewal cannot change accounts.
8. Call join reuses the appointment permissions/time window. A unique Mongo index permits only one tab per participant, including concurrent joins.
9. SDP/ICE signals and ephemeral call chat go only to authorized current call members. Audio/video stays in WebRTC.
10. Reconnecting the same client removes its previous connection/membership and rejoins the call. Explicit hang-up prevents automatic rejoin.
11. The minute sweep removes abandoned connections and expired call membership; the browser also enforces the returned call deadline.

API Gateway disconnect events are best effort. Database leases and explicit sweep checks handle missing events without depending on Mongo TTL deletion timing. The initial sweep processes up to 1,000 connections per invocation, oldest lease first; reassess batching and runtime limits before exceeding that scale.

## Local validation commands

Run in Windows PowerShell from the repository:

```powershell
npm.cmd ci
npm.cmd run build:lambda
npm.cmd run typecheck:client:runtime
npm.cmd run test:lambda
node node_modules/vitest/vitest.mjs run --project server src/server/realtime/gateway/__tests__
node node_modules/vitest/vitest.mjs run --project client src/client/__tests__/gateway-socket.test.ts src/client/__tests__/call-reconnect.test.ts
npm.cmd run build:client:prod -- --env-file=tests/responsive/build.env
```

The tests use temporary MongoDB and a mocked gateway transport. They do not use
AWS keys, send real email, or query the main database. Full typechecking and the
persistent server build are supported. Lambda also checks its runtime graph.

## Prepare AWS deployment

Install AWS CLI and AWS SAM CLI. Docker is optional for container builds; the current Node ZIP builds directly on Windows. Configure a deployment identity with the required CloudFormation, IAM, API Gateway, Lambda, EventBridge, packaging S3 and secret-read permissions. The app itself uses its Lambda role, not static AWS access keys.

In Secrets Manager, create one production JSON secret using `deploy/serverless/app-secret.example.json` as the list of keys. Replace every required placeholder. Include the optional provider/TURN keys with blank values when disabled. Use the main Vetify URI, independent signing secrets, and verified Resend senders with separate auth/professional mail keys. Do not commit the real JSON or put it in build output.

SAM resolves this existing secret into Lambda environment variables during deployment; rotating the secret requires updating the function configuration/deployment. The total environment value size must remain within Lambda's 4 KB limit. The secret ARN is the template's AppSecretArn parameter.

```powershell
npm.cmd run build:lambda
sam validate --lint --template-file deploy/serverless/template.yaml
sam build --template-file deploy/serverless/template.yaml --region ap-southeast-2
sam deploy --guided --stack-name vetify-backend --region ap-southeast-2 --profile vetify-deploy
```

In the guided prompts supply AppSecretArn and ClientOrigin=https://vetify.page. Review the CloudFormation change set and IAM changes before deployment. These commands create billable resources when you run deploy.

The template supplies HTTP, realtime, scheduled appointment/realtime maintenance and hourly clinic refresh. Professional proof photos transfer individually into private MongoDB drafts, then submit as small references. The frontend bucket/distribution and TURN hosting are configured separately. Live AWS acceptance remains required. Extracted subsystem workers are outside main.

## Wire the frontend

Read the stack outputs:

```powershell
aws cloudformation describe-stacks --stack-name vetify-backend --region ap-southeast-2 --profile vetify-deploy --query "Stacks[0].Outputs" --output table
```

In ignored `env.prod`, set these public addresses:

```dotenv
VITE_API_URL=/api/v1
VITE_REALTIME_URL=wss://REPLACE_API_ID.execute-api.ap-southeast-2.amazonaws.com/prod
```

Rebuild with `npm.cmd run build:client:prod -- --env-file=env.prod`. Upload only
`dist/client` to the private frontend S3 bucket. CloudFront forwards `/api/*` to
the `HttpApiUrl` hostname with caching disabled and the required headers, cookies,
and query strings. Keep the website and HTTP API on the same site for refresh
cookies and OAuth. Register provider callbacks under
`https://vetify.page/api/v1/auth/PROVIDER/callback`.

See [configuration](main-deployment/configuration.md) for the public build
allowlist. TURN credentials are supplied at runtime only after an authorized
appointment call join. They are visible to the authorized participant's browser
because WebRTC needs them; they are not embedded in public build output.

The browser connects directly to the wss gateway endpoint. No `/socket.io` CloudFront behavior is used for this transport. REALTIME_MANAGEMENT_ENDPOINT is injected by SAM and must match that API/stage; do not put server credentials in VITE settings.

Atlas access must allow the Lambda network. Lambda does not have one predictable outbound IP by default. Choose an Atlas-supported network access arrangement before deployment; a NAT/static-IP architecture has additional ongoing costs.

## Production acceptance checks

- Connect two accounts and test messages, read status, typing, notifications and multiple tabs.
- Confirm that a third account cannot join or send signals to another appointment.
- Confirm that two tabs of one participant cannot occupy both call positions.
- Disconnect the network, reconnect and verify call rejoin. Hang up, reconnect again and verify the call stays ended.
- Test expiry, password reset, suspension, reinstatement, logout/account switching and native planner token rejection.
- Keep a connection open beyond two hours and verify automatic reconnect.
- Test video on different networks using the production TURN configuration.
- Review CloudWatch errors/duration/throttling and credit usage. The template retains logs for seven days; configure billing alerts.

Costs include gateway messages/connection minutes, Lambda, Secrets Manager, logs, storage and any TURN relay. Estimate from expected usage instead of assuming credits cover any traffic level.

Sources: [Gateway lifecycle](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-route-keys-connect-disconnect.html), [connection quotas](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-execution-service-websocket-limits-table.html), [management API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-how-to-call-websocket-api-connections.html), [SAM build](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-build.html), [pricing](https://aws.amazon.com/api-gateway/pricing/).
