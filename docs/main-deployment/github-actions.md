# GitHub Actions deployment

Main Vetify uses GitHub Actions for CI and AWS deployment. The separate Books,
Blogs, Anatomy and Meal Planner applications are not deployed by these workflows.
The production region is Sydney, `ap-southeast-2`.

## What runs

1. Push or merge a change to `main`. Feature branches and pull requests do not
   trigger CI. There is no manual workflow trigger.
2. CI runs full lint, types, unit tests, browser tests and standalone startup.
3. The AWS job builds Lambda, runs its isolated runtime smoke, validates templates,
   and builds the production frontend using `deploy/github/frontend-build.env`.
4. Only after all checks pass, CI uploads the tested `aws-release` artifact.
5. Every successful push or merge into `main` automatically deploys that artifact.
6. Deployment updates the backend stack, checks database health, updates the
   frontend stack, uploads assets before HTML and waits for CloudFront invalidation.
7. Public-page, API-health, anonymous-access and JSON-error checks must pass.

Deployments run serially. Pull requests cannot obtain AWS credentials. Re-running
a failed job uses the same tested revision. Do not cancel a deployment mid-update.

## One-time AWS authorization

This account currently denies `iam:ListOpenIDConnectProviders` and
`iam:GetOpenIDConnectProvider` through an AWS Organizations service control policy.
The account administrator must authorize
GitHub OIDC provider setup before activation. Do not substitute a broad permanent
AWS access key to work around that restriction.

After authorization, the administrator should review `deploy/github/bootstrap.yaml`.
It creates a GitHub role trusted only for `iHoshiii/Vetify` on `main`, plus a separate
CloudFormation execution role. The execution role can read the application secret.
The GitHub role cannot retrieve it directly. Existing stack IAM roles are read-only
to this execution role. Changes that create or alter IAM roles require a separate
administrator review and deployment.

If a GitHub OIDC provider already exists, pass its ARN as `ExistingOidcProviderArn`.
Otherwise the template creates one with audience `sts.amazonaws.com`.

```powershell
aws cloudformation deploy --template-file deploy/github/bootstrap.yaml --stack-name vetify-github-deployment --region ap-southeast-2 --profile vetify-deploy --capabilities CAPABILITY_NAMED_IAM --no-execute-changeset --parameter-overrides ArtifactBucket=aws-sam-cli-managed-default-samclisourcebucket-4ig1icbdtwuu AppSecretArn=arn:aws:secretsmanager:ap-southeast-2:223703743978:secret:vetify/prod/app-UzxTQF
```

Review the change set, execute it, and wait for completion. Read the
`GitHubDeployRoleArn` and `CloudFormationRoleArn` stack outputs.

## GitHub repository settings

Open `iHoshiii/Vetify` → Settings → Secrets and variables → Actions → Variables.
Create these **repository variables**, not application secrets:

| Name                  | Value                                                         |
| --------------------- | ------------------------------------------------------------- |
| `AWS_DEPLOY_ROLE_ARN` | Bootstrap output `GitHubDeployRoleArn`                        |
| `AWS_CFN_ROLE_ARN`    | Bootstrap output `CloudFormationRoleArn`                      |
| `AWS_ARTIFACT_BUCKET` | `aws-sam-cli-managed-default-samclisourcebucket-4ig1icbdtwuu` |

Keep MongoDB, OAuth, mail and TURN secrets in AWS Secrets Manager.
Bedrock uses the Lambda execution role rather than an application API key.
GitHub does not need their values. The role ARNs and bucket name are identifiers.

Review and merge this branch through a pull request. With main-only execution,
these jobs run after merging. Do not require their status checks before merging
pull requests, since those requests do not trigger the workflow. CI failure still
blocks deployment after the merge. Branch protection can continue to require review.
Open Actions → CI to watch the automatic run after merging into `main`.
Deployment runs after all validation jobs pass, without an enable variable.

VS Code can report `Unable to find reusable workflow` for valid local workflow
references. Open the full Vetify repository folder, then use Developer: Reload Window.
The file must remain `.github/workflows/deploy-aws.yml` with `on.workflow_call`.
The workflow validation tests also check this reference. `Context access might be
invalid` warnings for `AWS_*` variables indicate that the editor cannot see those
repository variables. Configure the three variables above after AWS authorization
before merging the deployment workflow into `main`.

## Public build settings and secret changes

Edit only public frontend settings in `deploy/github/frontend-build.env`.
Keep `/api/v1` and the exact backend `RealtimeUrl` output. A mismatched WebSocket
URL stops deployment before publishing the frontend. Enable subsystem links only
after their independent applications are ready.

Deployment preserves the current stack's `AppSecretArn`, `ConfigRevision` and
certificate ARN. Rotating a Secrets Manager value still requires incrementing the
backend `ConfigRevision` in a separate authorized stack update. A code deployment
alone does not guarantee CloudFormation refreshes unchanged dynamic references.

## Failures and rollback

Inspect the first failed job in Actions. No deployment runs if validation fails.
CloudFormation rolls back a failed stack update. Existing hashed frontend files
are retained so cached pages can still load their previous assets.

For an application regression, revert the responsible commit on a branch and
merge the revert through a pull request. CI validates and deploys that revision.
Post-deployment health failure requires investigation and does not automatically
undo data or send test emails. Human acceptance still covers OAuth, real inbox
delivery, and two-user chat and video calls.

## Monitor the running application

1. In AWS, select Sydney (`ap-southeast-2`) and open Lambda → Functions.
   Open a `vetify-backend-*` function, then Monitor. Check Errors, Throttles,
   Invocations and Duration. Choose View CloudWatch logs to investigate failures.
   The shared application log group is `/aws/lambda/vetify-backend`.
2. Open API Gateway → HTTP API `qnjnr8fwf5` → Monitoring. Watch `5xx`, `Latency`
   and `IntegrationLatency`; a handled HTTP error may not count as a Lambda error.
3. Open CloudFront → distribution `E3UQC3URTVYDHE` → Monitoring. Check requests
   and the 4xx/5xx error rates for website delivery.
4. Open `https://vetify.page/api/v1/health`. A healthy database connection returns
   JSON containing `"status":"ok"` and `"db":"connected"`.

## References

- [GitHub OIDC for AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
- [AWS SAM with GitHub Actions](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/deploying-using-github.html)
- [Lambda monitoring](https://docs.aws.amazon.com/lambda/latest/dg/lambda-monitoring.html)
- [HTTP API metrics](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-metrics.html)
- [CloudFront metrics](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html)
