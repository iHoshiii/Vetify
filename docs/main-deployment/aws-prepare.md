# AWS preparation, from the beginning

Reviewed 25 October 2026. For an existing deployment, check
[GitHub automation](github-actions.md) before creating resources manually.

Only main Vetify is being deployed. Four feature repositories already exist
locally and deploy separately later. Read [the extraction gate](extraction-checklist.md)
first; extracted feature implementations are excluded from main's package.

## 1. Protect the account and set a budget

In AWS Console, enable root MFA and use a separate deployment identity for work.
Open Billing and Cost Management > Credits and Free Tier. Record the credit
balance and expiry actually shown. An extra $100 is earned, not automatic.
[AWS Free Tier FAQ](https://aws.amazon.com/free/free-tier-faqs/).

Open Budgets > Create budget > Cost budget. Start with $20/month as a learning
target, with actual alerts at 50%, 80%, 100% and a forecast alert at 100%.
Include usage costs before credits so credits do not hide consumption.
Alerts do not stop resources, and this target is not a cost guarantee.
Review Bedrock token costs plus MongoDB, Resend and TURN costs weekly.
[Budgets guidance](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html).

Use Sydney (`ap-southeast-2`) for backend/S3/Secrets Manager. This account's
project is assigned there. The CloudFront certificate uses `us-east-1`.

## 2. Install tools on Windows

Install AWS CLI v2 and AWS SAM CLI from their official installers.
Docker Desktop is optional for container builds and local Lambda emulation;
the current Node ZIP package builds with SAM directly on Windows.
Node/npm already exist in this workspace; Node 24 matches the Lambda template.

- [AWS CLI install](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [SAM CLI install](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

Open a new PowerShell terminal:

```powershell
aws --version
sam --version
node --version
npm.cmd --version
aws login --profile vetify-deploy --region ap-southeast-2
aws configure set region ap-southeast-2 --profile vetify-deploy
aws sts get-caller-identity --profile vetify-deploy
```

`aws login` needs CLI 2.32+ and the identity's `SignInLocalDevelopmentAccess`
permission; it does not itself grant deployment permissions. Use your account's
temporary-credential/SSO flow instead if applicable. Verify the displayed AWS
account ID before deploying. Do not paste access keys into code or chat.
[CLI login](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html).

## 3. Finish the main release prerequisites

1. Check the extracted features remain absent from main's package.
2. Professional applications send each proof photo separately before submitting
   small references. Private MongoDB drafts expire after two hours. Submitted
   photos retain existing account access checks and never enter frontend S3.
3. Scheduled Lambda maintenance now runs appointment reminders, completion,
   delivery retries and realtime cleanup. Local interval scanners remain for
   local development. A separate hourly Lambda refreshes the daily clinic cache.
4. Lambda rate counters use MongoDB across instances. Verify production email
   delivery, secret sizes and error handling before accepting users.
5. Test main auth/professional/appointments/realtime regression and fix relevant
   failures. Use the [audit](repository-cleanup-audit.md) for dated local evidence;
   release acceptance still checks the deployed revision.
6. Configure/test TURN for real video calls across networks. API Gateway carries
   signalling, not the media stream. A relay/provider is a separate cost.

Main can launch while future feature links are unavailable. Coordinate the
Planner/main introspection version mismatch before native integration. Configure
and jointly validate the optional Anatomy/Books OIDC clients before enabling
their sign-in. Blog registration is separate; feature apps deploy independently.

## 4. Configure the domain's DNS

Keep the current Name.com nameservers. In Name.com > My Domains > vetify.page >
Manage DNS Records, add the certificate and email verification records when
requested. Preserve existing mail records. No Route 53 hosted zone is required.

## 5. Request the frontend certificate

Switch AWS region to **US East (N. Virginia), `us-east-1`**.
ACM > Request public certificate > `vetify.page` > DNS validation.
Add its CNAME validation record in your active DNS provider and wait for Issued.
This plan serves the apex domain only; add `www` only if you also configure its
certificate, DNS and redirect. Future feature subdomains can receive certificates later.
[CloudFront certificate requirements](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html).

## 6. Configure production email and social login

Verify `vetify.page` in Resend using its displayed DNS records.
Use separate auth and professional-mail keys and verified senders, for example
`Vetify <no-reply@vetify.page>` and `Vetify <professionals@vetify.page>`.
Creating these sender identities does not create an inbox.
Use real production callback addresses in each enabled social provider:
`https://vetify.page/api/v1/auth/google/callback`, and the equivalent Facebook
or TikTok path. Leave unavailable providers unconfigured.
[Resend domains](https://resend.com/docs/dashboard/domains/introduction).

## 7. Prepare main MongoDB connectivity

Create a least-privilege production database user for the actual MAIN cluster
and explicitly select `/vetify`. Do not use the Meal Planner cluster or its user.
Keep credentials outside version control. No account recreation or migration is
implied by creating an AWS deployment.

Agree an Atlas network-access policy before deploying. A laptop-only IP rule
does not admit Lambda; ordinary Lambda egress has no single fixed IP.
Private connectivity or fixed egress needs extra networking and cost planning.
An all-address rule is not a substitute for a production network design.
Do not add a NAT Gateway silently to this small-budget setup.
[Atlas network access](https://www.mongodb.com/docs/atlas/security/ip-access-list/).

## 8. Create the production secret

Switch back to Sydney. Secrets Manager > Store a new secret > Other type >
Plaintext. Use the field names in `deploy/serverless/app-secret.example.json`.
Fill its placeholders privately, keeping every field the template references,
including blank strings for genuinely disabled optional providers.
Name it `vetify/prod/app` and save its ARN for SAM's `AppSecretArn` parameter.

For optional OIDC or Books worker checks, follow the separate
[configuration and flag requirements](configuration.md). Do not enable a flag
until its private fields and the receiving application's settings are ready.

Generate independent random values locally for JWT and OAuth state secrets:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Run twice. Use production-only credentials. Do not copy local testing passwords.
The current template resolves the JSON fields into Lambda environment variables
at deployment. Check their combined size against Lambda's 4 KB limit. Updating
the secret alone does not refresh deployed values; update the stack/configuration.
[Lambda environment guidance](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html).

Continue with [AWS deployment](aws-deploy.md) only after step 3 passes.
