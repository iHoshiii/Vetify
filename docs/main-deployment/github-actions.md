# GitHub Actions deployment

Reviewed 25 October 2026 against `.github/workflows/ci.yml`,
`deploy-aws.yml`, and the deployment scripts. Resource names below are examples
or stack names; obtain environment-specific IDs from your own stack outputs.

Main Vetify uses GitHub Actions for CI and AWS deployment. The separate Books,
Blogs, Anatomy and Meal Planner applications are not deployed by these workflows.
The production region is Sydney, `ap-southeast-2`.

## What runs

1. Push or merge a change to `main`. Feature branches and pull requests do not
   trigger CI. There is no manual workflow trigger.
2. CI runs lint, types, public-browser-setting guards, unit tests, browser tests,
   and standalone production startup.
3. The AWS job builds Lambda, runs its isolated runtime smoke, validates templates,
   and builds the production frontend using `deploy/github/frontend-build.env`.
4. Only after all checks pass, CI uploads the tested `aws-release` artifact.
5. Every successful push or merge into `main` automatically deploys that artifact.
6. Deployment updates the backend stack, checks database health, updates the
   frontend stack, uploads assets before HTML and waits for CloudFront invalidation.
7. Public-page, API-health, anonymous-access and JSON-error checks must pass.

Deployments run serially. Pull requests cannot obtain AWS credentials. Re-running
a failed job uses the same tested revision. Do not cancel a deployment mid-update.
Deployment also checks the persistent monthly-budget shutdown flag before changes.
The separate [budget controller](../../deploy/budget-guard/README.md) stops main
Vetify at 80% of reported monthly cost and requires a manual restore.

## One-time AWS authorization

The active workflow uses the existing `github-actions-deployer` IAM user's access
key pair. Programmatic IAM access does not require a plan upgrade or an OIDC
provider. Account and organization restrictions still apply to every AWS request.

An administrator deploys `deploy/github/access-key-bootstrap.yaml` once. It creates
a CloudFormation execution role and adds scoped deployment permissions to the
existing IAM user. The execution role can read the application secret. The added
user policy cannot retrieve it directly. Existing stack IAM roles are read-only
to the execution role, so IAM changes still require administrator review.

```powershell
aws cloudformation deploy --template-file deploy/github/access-key-bootstrap.yaml --stack-name vetify-github-access-keys --region ap-southeast-2 --profile vetify-deploy --capabilities CAPABILITY_NAMED_IAM --no-execute-changeset --parameter-overrides ArtifactBucket=REPLACE_ARTIFACT_BUCKET AppSecretArn=REPLACE_APP_SECRET_ARN GitHubUserName=github-actions-deployer
```

Review the change set, execute it, and wait for completion. Read the
`CloudFormationRoleArn` stack output. This does not create an OIDC provider or
change the account's billing plan. The older `bootstrap.yaml` is an optional OIDC
setup for accounts that permit federation and is not used by the active workflow.

## GitHub repository settings

Open the repository's Settings > Secrets and variables > Actions > Secrets.
Create these **repository secrets** under the Secrets tab:

| Name                    | Value                                                         |
| ----------------------- | ------------------------------------------------------------- |
| `AWS_ACCESS_KEY_ID`     | Access key ID for `github-actions-deployer`                   |
| `AWS_SECRET_ACCESS_KEY` | Matching secret access key                                    |
| `AWS_CFN_ROLE_ARN`      | Bootstrap output `CloudFormationRoleArn`                      |
| `AWS_ARTIFACT_BUCKET`   | Existing SAM artifact bucket from your deployment environment |

Keep MongoDB, OAuth, mail and TURN secrets in AWS Secrets Manager.
Bedrock uses the Lambda execution role rather than an application API key.
GitHub does not need their values. `AWS_DEPLOY_ROLE_ARN` is no longer used.
The access key pair stays in GitHub Secrets and is passed only to the AWS job.

For CARTO Basemaps, optionally add a repository secret named `VITE_CARTO_KEY`
containing your dedicated Basemaps key. CI injects it only into the production
frontend build. Keep the actual key out of `deploy/github/frontend-build.env`.
This keeps it out of the repository source; the deployed browser bundle and map
tile requests still contain it. Restrict the key to `vetify.page` in CARTO's
dashboard and monitor its usage. Local production builds can read the key from
an ignored production env file, or from the `VITE_CARTO_KEY` process variable.

Review and merge this branch through a pull request. With main-only execution,
these jobs run after merging. Do not require their status checks before merging
pull requests, since those requests do not trigger the workflow. CI failure still
blocks deployment after the merge. Branch protection can continue to require review.
Open Actions > CI to watch the automatic run after merging into `main`.
Deployment runs after all validation jobs pass, without an enable variable.

VS Code can report `Unable to find reusable workflow` for valid local workflow
references. Open the full Vetify repository folder, then use Developer: Reload Window.
The file must remain `.github/workflows/deploy-aws.yml` with `on.workflow_call`.
The workflow validation tests also check this reference. `Context access might be
invalid` warnings may be stale after changing authentication. Save the workflow
and reload the window. All four secrets are declared by the reusable workflow and
passed explicitly by CI. Validate both files with actionlint before merging.

## Public build settings and secret changes

Edit only public frontend settings in `deploy/github/frontend-build.env`.
Keep `/api/v1` and the exact backend `RealtimeUrl` output. A mismatched WebSocket
URL stops deployment before publishing the frontend. The builder permits only
the six settings in [configuration](configuration.md); it excludes unknown
ambient `VITE_*` names and rejects URLs carrying credentials or query strings.
Enable subsystem links only after their independent applications are ready.

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

1. In AWS, select Sydney (`ap-southeast-2`) and open Lambda > Functions.
   Open a `vetify-backend-*` function, then Monitor. Check Errors, Throttles,
   Invocations and Duration. Choose View CloudWatch logs to investigate failures.
   The shared application log group is `/aws/lambda/vetify-backend`.
2. Open API Gateway > the HTTP API from your backend stack > Monitoring. Watch `5xx`, `Latency`
   and `IntegrationLatency`; a handled HTTP error may not count as a Lambda error.
3. Open CloudFront > the distribution from your frontend stack > Monitoring. Check requests
   and the 4xx/5xx error rates for website delivery.
4. Open `https://vetify.page/api/v1/health`. A healthy database connection returns
   JSON containing `"status":"ok"` and `"db":"connected"`.

## References

- [GitHub OIDC for AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
- [AWS SAM with GitHub Actions](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/deploying-using-github.html)
- [Lambda monitoring](https://docs.aws.amazon.com/lambda/latest/dg/lambda-monitoring.html)
- [HTTP API metrics](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-metrics.html)
- [CloudFront metrics](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html)
