# Bedrock chatbot migration

Main Vetify's chat adapter uses Amazon Bedrock Converse in Sydney. Nova Lite
(`amazon.nova-lite-v1:0`) is the default; Nova Micro is the text-only alternative.
The browser uses the existing `/api/v1/chat` route and saves history as before.
Legacy Gemini model selections normalize to Nova Lite. Legacy `model` history
roles become `assistant` turns, preserving their text.

## Current activation blocker

On 16 October 2026, a Sydney Converse probe returned `AccessDeniedException`
because the AWS account was being verified. On 17 October, the Nova Lite
playground returned `ThrottlingException: Too many tokens per day` and the
console showed zero on-demand TPM and RPM for both Lite and Micro. Account
verification or another account restriction may explain the zero quotas, but
AWS Support must confirm the cause. An account-plan upgrade is not a confirmed fix.

The code and tests can be prepared before verification finishes. The live site
continues using its deployed version until the migration is deployed. Mocked
tests do not establish the quality of real model responses.

## Local setup

Keep existing database, JWT, OAuth, mail and TURN settings. Chat no longer
requires `GEMINI_API_KEY` and no Bedrock API key is needed by this integration.
Use the AWS SDK's local profile credential chain:

```powershell
aws login --profile vetify-deploy --region ap-southeast-2
$env:AWS_PROFILE = 'vetify-deploy'
$env:BEDROCK_REGION = 'ap-southeast-2'
npm.cmd run dev
```

The authenticated identity must have `bedrock:InvokeModel` for the selected model.
Do not put AWS credentials in any `VITE_*` setting or browser code.

## Validate and activate

1. After AWS resolves the zero quotas, open Amazon Bedrock in Sydney and test
   Nova Lite in the chat playground. Catalog access alone does not prove invocation access.
2. Test routine pet-care questions, follow-up context, refusal of unrelated
   requests, and urgent situations such as poisoning or difficulty breathing.
   Confirm urgent examples direct the owner to a licensed veterinarian immediately.
3. Validate the code, build Lambda and run the isolated smoke:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build:lambda
npm.cmd run test:lambda
sam validate --lint --template-file deploy/serverless/template.yaml --region ap-southeast-2
```

4. Have the administrator review the SAM change set. The template adds
   `bedrock:InvokeModel` only to the HTTP Lambda role, for Nova Lite and Micro
   in the stack's region. This changes IAM permissions. The GitHub CloudFormation
   execution role deliberately cannot modify IAM policies, so apply this initial
   permission change through an authorized administrator deployment.
5. Deploy the backend and rebuild/publish the frontend through the existing main
   deployment process. Verify anonymous quotas, signed-in chat, model selection,
   edit/cancel, restored chat sessions and handled upstream failures.

## Returning to Gemini

If Bedrock remains unavailable, revert `41b1057`
(`feat(chat): migrate veterinary assistant to Amazon Bedrock`), then run `npm ci`.
This restores the Gemini adapter, model choices, dependency and deployment settings.
Keep the existing Gemini secret until the provider decision is settled, and verify
its key and model availability before deployment. A local commit or revert does
not change the live website. Rebuild and validate before publishing a rollback.

## Runtime limits and monitoring

Converse requests have a 22-second deadline, at most two SDK attempts, and the
existing 2,048-token maximum response length. Existing chat rate limits remain.
The backend returns the same reply/error response format and retains LangSmith
tracing with Bedrock provider tags. Provider error details are not returned to users.
Tracing receives message text, history and model selection without account/session identifiers.

Bedrock input/output tokens incur usage charges. Check the selected model's
pricing and promotional-credit eligibility before launch, and monitor token usage
alongside the existing AWS budget. Usage alerts are not a hard spending cap.

- [Converse API and required IAM permission](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html)
- [Nova models](https://docs.aws.amazon.com/nova/latest/userguide/what-is-nova.html)
- [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/)
