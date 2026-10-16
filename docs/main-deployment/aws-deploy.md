# AWS deployment, main Vetify only

Follow [preparation](aws-prepare.md) first. Commands here are instructions for a
later deployment; they have not been run against AWS by preparing this guide.

## 9. Build and deploy the backend

After the main-only extraction and required serverless fixes pass:

```powershell
Set-Location C:\Users\Administrator\OneDrive\Desktop\Vetify
npm.cmd ci
npm.cmd run typecheck:client:runtime
npm.cmd run build:lambda
npm.cmd run test:lambda
sam validate --lint --template-file deploy/serverless/template.yaml
sam build --use-container --template-file deploy/serverless/template.yaml
sam deploy --guided --template-file .aws-sam/build/template.yaml --stack-name vetify-backend --region ap-southeast-1 --profile vetify-deploy
```

Supply `AppSecretArn` from preparation and `ClientOrigin=https://vetify.page`.
Review the change set, acknowledge required IAM capabilities and save SAM config
locally. Reauthenticate the CLI if its temporary credentials expire.
Do not manually recreate WebSocket APIs in parallel with the SAM-managed stack.
Save the output values `HttpApiUrl` and `RealtimeUrl`; do not invent their IDs.
The current stack creates HTTP, WebSocket and maintenance Lambdas. The scheduled
maintenance invocation runs appointment reminders, completion, delivery retries and realtime cleanup.

## 10. Create the private frontend S3 bucket

In Singapore: S3 > Create bucket. Choose a globally unique name, such as
`vetify-main-web-<your-account-id>`. Keep Block Public Access enabled, ACLs
disabled/Bucket owner enforced and default encryption. Leave static website
hosting disabled. CloudFront uses the regular S3 origin with OAC.
Choose versioning/retention deliberately; stored versions incur storage cost.

If main upload storage was implemented, create its **separate private bucket**
with the permissions, CORS and signed operations required by that implementation.
Do not mix identity proof images with publicly served frontend files.

## 11. Create the CloudFront distribution

CloudFront > Create distribution. Select the private main frontend S3 bucket.
Create Origin Access Control, choose signing requests, and apply the generated
bucket policy allowing this distribution to read frontend objects.
Use HTTPS redirect, default root `index.html`, alternate domain `vetify.page`
and the issued ACM certificate from `us-east-1`.
Review the available pricing plan against your credits/expected traffic; a
CloudFront plan does not cover all backend or external-service costs.
[OAC guidance](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html).

Add a second origin using only the hostname from `HttpApiUrl`:
`<actual-id>.execute-api.ap-southeast-1.amazonaws.com`.
Use HTTPS to origin, no `/api` origin path and no stage path for the stack's
default HTTP stage. Add a behavior with path `/api/*`:

- Origin: the HTTP API, not S3.
- Allowed methods: all seven, including POST/PATCH/DELETE/OPTIONS.
- Cache policy: managed `CachingDisabled`.
- Origin request policy: managed `AllViewerExceptHostHeader`, which forwards
  cookies, authorization and query parameters while using the API origin's Host.
- Viewer protocol: redirect HTTP to HTTPS.

Keep the default `*` behavior on S3. The WebSocket URL is used directly by the
browser; it does not use a CloudFront `/socket.io` route.
[Managed policy reference](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html).

## 12. Support React deep links

CloudFront > Functions > Create `vetify-main-spa`. Use this viewer-request code:

```javascript
function handler(event) {
  var request = event.request;
  if (request.uri.indexOf('/api/') !== 0 && request.uri.indexOf('.') === -1) {
    request.uri = '/index.html';
  }
  return request;
}
```

Test, publish and associate it with the **default S3 behavior only**.
Do not attach it to `/api/*` or globally turn API 403/404 responses into index.html.
Verify application routes containing a dot separately if you introduce any.

## 13. Point the domain at CloudFront

Route 53 > `vetify.page` zone > Create record > apex A > Alias > CloudFront.
Select the actual distribution. Add an AAAA alias if IPv6 is enabled.
Wait for DNS and distribution changes to finish. Keep certificate validation
records and the Resend DNS records.
[Alias steps](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-cloudfront-distribution.html).

## 14. Build main frontend with public production settings

Create ignored `env.prod` in the main repository. Local `.env` stays local.
For Lambda, backend secrets belong in Secrets Manager, not this frontend file.
The current builder accepts these public settings:

```dotenv
NODE_ENV=production
VITE_API_URL=/api/v1
VITE_REALTIME_URL=wss://<actual-websocket-api-id>.execute-api.ap-southeast-1.amazonaws.com/prod
VITE_CARTO_KEY=
```

Use the exact `RealtimeUrl` stack output. Main supports `VITE_BOOKS_ORIGIN` and
`VITE_ANATOMY_ORIGIN` and `VITE_BLOGS_ORIGIN` for external launch links. Leave them blank until their
separate destinations and shared login are ready. Planner's public app page uses
local content settings for its download QR/photos. Blog launch links use the separate app origin.

```powershell
npm.cmd run build:client:prod -- --env-file=env.prod
```

Inspect `dist/client` and `dist/lambda` using the extraction acceptance checklist
before uploading. Do not upload the repository, `.env`, `env.prod` or source snapshots.

## 15. Upload frontend files

Replace both placeholders with real resource IDs:

```powershell
aws s3 sync dist/client s3://<main-frontend-bucket> --exclude index.html --cache-control "public,max-age=3600" --profile vetify-deploy
aws s3 cp dist/client/index.html s3://<main-frontend-bucket>/index.html --cache-control "no-cache" --content-type "text/html" --profile vetify-deploy
aws cloudfront create-invalidation --distribution-id <actual-distribution-id> --paths "/*" --profile vetify-deploy
```

Keep old hashed assets during a release so open browser tabs can still fetch
their original chunks. Use a later deliberate cleanup policy, not `sync --delete`.

## 16. Validate and monitor

Follow [live acceptance](aws-acceptance.md). Do not declare launch successful
based only on the homepage loading or a Lambda health response.
