# AWS preparation, from the beginning

Only main Vetify is being deployed. Four feature repositories already exist
locally and deploy separately later. Read [the extraction gate](extraction-checklist.md)
first; current output is not yet main-only.

## 1. Protect the account and set a budget

In AWS Console, enable root MFA and use a separate deployment identity for work.
Open Billing and Cost Management > Credits and Free Tier. Record the credit
balance and expiry actually shown. An extra $100 is earned, not automatic.
[AWS Free Tier FAQ](https://aws.amazon.com/free/free-tier-faqs/).

Open Budgets > Create budget > Cost budget. Start with $20/month as a learning
target, with actual alerts at 50%, 80%, 100% and a forecast alert at 100%.
Include usage costs before credits so credits do not hide consumption.
Alerts do not stop resources, and this target is not a cost guarantee.
Review costs weekly, including MongoDB, Resend, Gemini and TURN outside AWS.
[Budgets guidance](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html).

Use `ap-southeast-1` for backend/S3/Secrets Manager unless an existing service
requires a different region. The CloudFront certificate is the exception.

## 2. Install tools on Windows

Install AWS CLI v2, AWS SAM CLI and Docker Desktop from their official installers.
Start Docker Desktop and use Linux containers for SAM container builds.
Node/npm already exist in this workspace; Node 24 matches the Lambda template.

- [AWS CLI install](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [SAM CLI install](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

Open a new PowerShell terminal:

```powershell
aws --version
sam --version
docker version
node --version
npm.cmd --version
aws login --profile vetify-deploy
aws configure set region ap-southeast-1 --profile vetify-deploy
aws sts get-caller-identity --profile vetify-deploy
```

`aws login` needs CLI 2.32+ and the identity's `SignInLocalDevelopmentAccess`
permission; it does not itself grant deployment permissions. Use your account's
temporary-credential/SSO flow instead if applicable. Verify the displayed AWS
account ID before deploying. Do not paste access keys into code or chat.
[CLI login](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html).

## 3. Finish the main release prerequisites

1. Extract the four features and satisfy the main-only package gate.
2. Main professional applications currently carry large base64 images. Implement
   authorized private S3 upload/download and store object keys before relying on
   Lambda for those submissions. The frontend bucket is not private user storage.
3. Schedule main appointment reminders, completion and delivery retries durably.
   Current Lambda maintenance handles realtime cleanup only; local interval
   scanners do not automatically run in Lambda. Review the clinic refresh too.
4. Verify persistent rate limits, email delivery, secret sizes and error handling.
5. Test main auth/professional/appointments/realtime regression and fix relevant
   failures. Earlier focused checks did not make the full test suite green.
6. Configure/test TURN for real video calls across networks. API Gateway carries
   signalling, not the media stream. A relay/provider is a separate cost.

Main can launch while future feature links are unavailable. Coordinate the
Planner/main introspection version mismatch and complete shared web SSO before
enabling the respective integrations; no need to deploy the feature apps now.

## 4. Configure the domain's DNS

In Route 53 > Hosted zones > Create hosted zone: name `vetify.page`, type Public.
Copy existing DNS records before changing nameservers, especially mail records.
In your domain registrar, replace its nameservers with the zone's four NS values.
You keep domain ownership at the registrar. Wait until DNS resolves via Route 53.
Use an existing DNS provider instead if you want to avoid moving nameservers;
the same certificate/domain-verification records still need to be added there.

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

Switch back to Singapore. Secrets Manager > Store a new secret > Other type >
Plaintext. Use the field names in `deploy/serverless/app-secret.example.json`.
Fill its placeholders privately, keeping every field the template references,
including blank strings for genuinely disabled optional providers.
Name it `vetify/prod/app` and save its ARN for SAM's `AppSecretArn` parameter.

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
