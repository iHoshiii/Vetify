# Main frontend infrastructure

This CloudFormation template provides the private S3 bucket, CloudFront OAC,
HTTPS domain and `/api/*` proxy described in the main deployment guide.
It deploys no extracted subsystem. It retains the bucket if the stack is deleted.
Use either this stack or manual creation, not both for the same website.

Deploy the backend first. Obtain `HttpApiUrl` from `vetify-backend` and use only
its hostname for `ApiHostname`. Wait until the ACM certificate is **ISSUED** in
`us-east-1`. The frontend stack itself uses Sydney.

```powershell
sam validate --lint --template-file deploy/frontend/template.yaml --region ap-southeast-2
aws cloudformation deploy --template-file deploy/frontend/template.yaml --stack-name vetify-frontend --region ap-southeast-2 --profile vetify-deploy --no-execute-changeset --parameter-overrides ApiHostname=REPLACE_API_HOSTNAME CertificateArn=REPLACE_CERTIFICATE_ARN
```

Review the returned change set, then execute it and wait for completion. Read
the stack outputs for the bucket, distribution ID and distribution hostname.
In Name.com, point an apex ANAME record at that distribution hostname. Preserve
the existing ACM validation and Resend records. Do not change nameservers.

Build with public settings in ignored `env.prod`: `/api/v1` and the exact backend
`RealtimeUrl`. Follow [the deployment guide](../../docs/main-deployment/aws-deploy.md)
for the production build, S3 uploads and invalidation commands. Upload only
`dist/client`, never environment files or backend/source directories.

The default S3 behavior alone has the React route rewrite. API requests forward
authorization, cookies and query parameters with caching disabled. Missing API
paths retain their JSON error response. Test login, refresh, signout, nested
routes and the WebSocket connection after DNS resolves to CloudFront.
