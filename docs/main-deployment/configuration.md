# Configuration and credential boundaries

Reviewed 25 October 2026. Keep private values out of tracked files, browser
bundles, screenshots, terminal transcripts, and published build artifacts.

## Configuration sources

| Source                                      | Purpose                                                             | Publication rule                              |
| ------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| `.env.example`                              | Local configuration template                                        | Placeholders only                             |
| `.env`, `.env.*`, `env.prod`                | Ignored local settings                                              | Never commit or upload                        |
| `.env.prod.example`                         | Production setting names for standalone/server and frontend use     | Blank private fields; not a deployable secret |
| `deploy/github/frontend-build.env`          | CI frontend settings                                                | Public addresses only                         |
| `deploy/serverless/app-secret.example.json` | SAM application secret field names                                  | Placeholders only                             |
| AWS Secrets Manager application secret      | Production server configuration injected by SAM                     | Server-only access                            |
| GitHub Actions secrets                      | Deployment identity, resource references, optional public CARTO key | Restricted workflow access                    |

The frontend build does not need MongoDB, JWT, mail, OAuth, or AWS credentials.
Prefer a minimal public-only `env.prod` for frontend work. The broader example
also lists standalone server fields; the production builder ignores those fields.

## Production browser allowlist

`scripts/build-client-prod.mjs` reads the selected env file, uses an isolated Vite
env directory, and disables automatic prefix exposure with `envPrefix: []`.
`scripts/public-build-settings.mjs` explicitly supplies these six settings:

| Setting               | Accepted value                         | Public behavior                                             |
| --------------------- | -------------------------------------- | ----------------------------------------------------------- |
| `VITE_API_URL`        | `/api/v1` or a clean HTTPS URL         | API base address; defaults to `/api/v1`                     |
| `VITE_REALTIME_URL`   | Blank or a clean WSS URL               | Gateway endpoint; blank selects Socket.IO                   |
| `VITE_CARTO_KEY`      | Dedicated browser basemap key or blank | Visible in browser requests; process value takes precedence |
| `VITE_BOOKS_ORIGIN`   | Blank or clean HTTPS origin            | Books launch destination                                    |
| `VITE_ANATOMY_ORIGIN` | Blank or clean HTTPS origin            | Anatomy integration; blank uses its built-in origin default |
| `VITE_BLOGS_ORIGIN`   | Blank or clean HTTPS origin            | Blog launch destination                                     |

URLs cannot contain username/password credentials, query parameters, or fragments.
Feature origins cannot contain paths beyond `/`. Validation errors name the
setting without echoing its value. Blank Books/Blog origins show unavailable
states. Anatomy instead defaults to `https://anatomy.vetify.page` in production
and `http://localhost:5176` in development; blank does not disable that integration.
Do not add access tokens to launch URLs.

Only `VITE_CARTO_KEY` intentionally reads a process override. Unknown ambient
`VITE_*` names are excluded by the production builder. Vite's own mode flags
remain available. The standard `build:client` and local dev commands use ordinary
Vite environment behavior; keep every `VITE_*` value public even in development.

```powershell
npm.cmd run build:client:prod -- --env-file=env.prod
node --test scripts/__tests__/public-build-settings.test.mjs
```

The tests include a real Vite bundle with synthetic private canaries. Adding a
public setting requires an explicit helper change, matching tests, and this table.

## Server-only credentials

Keep MongoDB credentials, JWT/OAuth signing secrets, social provider secrets,
mail keys, AWS credentials, OIDC private signing/cookie keys, and service tokens
outside frontend configuration. Bedrock uses the server AWS credential chain or
Lambda role rather than an application API key.

TURN is a special runtime boundary: authenticated appointment participants receive
ICE configuration after an authorized call join because WebRTC needs it. TURN
credentials are absent from public build output but are visible to those callers.
Use dedicated relay credentials and rotate them with the provider's controls.

Public API hosts, WebSocket hosts, account/resource IDs, OAuth client IDs, and
OIDC discovery/public signing keys are identifiers or public metadata. Their
presence alone does not establish a secret leak. Do not confuse the public JWKS
endpoint with the private `OIDC_JWKS` server configuration.

## Optional integrations and rotation

| SAM flag                        | Enables                                     | Required private configuration                       |
| ------------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| `SharedAuthEnabled=true`        | Anatomy OIDC provider                       | Anatomy client secret, cookie keys, private RSA JWKS |
| `BooksSharedAuthEnabled=true`   | Books OIDC client, with shared auth enabled | Independent Books client secret                      |
| `BooksCapabilitiesEnabled=true` | Books worker approval lookup                | Service-token SHA-256 digest and expiry              |

All flags default to false. See [OIDC setup](anatomy-oidc.md) and
[Books worker rotation](books-capabilities.md). The OIDC generator creates three
required fields; it does not create the optional Books client secret.

SAM resolves Secrets Manager values into Lambda environment variables at deploy
time. Changing a value in the same secret requires a backend configuration
update with an increased `ConfigRevision`. A code-only deployment does not
guarantee refreshed values. Review the combined environment size against the
Lambda limit before enabling extra fields.

If a real credential is exposed, rotate/revoke it at the issuing service, update
its consumers, and verify the old value fails. Removing a source line does not
revoke a credential. Review history and artifacts separately; do not rewrite
shared Git history as an incidental cleanup step.

The [repository audit](repository-cleanup-audit.md) records this pass's findings
and limitations. It does not certify cloud-account permissions or live credentials.
