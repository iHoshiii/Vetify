# Monthly budget shutdown

Reviewed 25 October 2026 against the controller and infrastructure template.

`vetify-budget-guard` checks the reported `vetify-monthly` cost every 15 minutes.
At 80% of the current month's planned limit, it sets a persistent shutdown flag,
sets the four application Lambda concurrency limits to zero, disables the two
scheduled jobs, disables the HTTP and WebSocket default endpoints, and disables
the main CloudFront distribution. An expired budget also triggers shutdown.

The controller does not delete accounts, databases, files, APIs or stacks. Its
own schedule keeps running so it can retry incomplete shutdown operations.
No resource restarts automatically at the next month. An administrator must
review the budget, restore the original settings saved in the parameter, and
explicitly set `shutdown` to `false` before application deployment can continue.

AWS reports budget costs late. This is a reduction mechanism, not an exact
dollar cap. Storage, existing WebSocket connections, previously running requests,
and control-plane activity can continue consuming credits after the trigger.
Review the actual AWS account plan, credits, billing terms, and external-service
charges separately. This controller does not guarantee zero billing.

## Deploy and verify

Use the administrator profile to build and deploy this separate infrastructure
stack. The application deployer cannot change its controller or shutdown flag.

```powershell
sam build --template-file deploy/budget-guard/template.yaml --build-dir node_modules/.cache/budget-guard-build
sam deploy --template-file node_modules/.cache/budget-guard-build/template.yaml --stack-name vetify-budget-guard --s3-bucket REPLACE_ARTIFACT_BUCKET --s3-prefix vetify-budget-guard --capabilities CAPABILITY_IAM --region ap-southeast-2 --profile vetify-deploy --no-execute-changeset --no-fail-on-empty-changeset
```

Review the generated change set before executing it. Obtain the artifact bucket
from the existing SAM environment rather than copying another account's name.

A read-only live test uses payload `{"dry_run":true}`. It reads budget costs and
the resources' current settings and reports target counts without changing them.
Never lower the live budget just to test the shutdown. The Python unit tests
exercise shutdown, retries, planned monthly limits and recovery-state preservation
using mocked AWS clients.

The recovery parameter is `/vetify/monthly-budget-stop` in Sydney. Its JSON saves
the original concurrency, rule states, endpoint flags and distribution state.
The GitHub deployment checks this flag before modifying application resources.
