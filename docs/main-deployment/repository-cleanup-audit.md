# Repository cleanup audit

Date: **25 October 2026**. Scope: sensitive exposure, unused code, compatible
dependency patches, and maintained repository documentation. The owner selected
safe cleanup and documentation of major migrations, without forced major upgrades.

## Findings and fixes

No current application credential was identified in the scanned source or tested
production browser output. This is bounded repository evidence, not a guarantee
that every credential, artifact, or deployed service is safe.

| Area                           | Evidence                                                                                                                 | Action                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Current files                  | Initial inventory of 1,084 tracked files; pattern checks and exact-copy checks against 13 local private settings         | Actual env files remain ignored; no private values included in this report                  |
| Git history                    | Gitleaks 8.30.1 over all reachable refs, with redacted output                                                            | Triaged six findings; history unchanged                                                     |
| Production browser             | Built real client with synthetic server/AWS/unknown-prefixed canaries; checked output for those and local private values | No matches found                                                                            |
| Implicit frontend env exposure | Ambient `VITE_*` names could enter ordinary Vite exposure                                                                | Production builder disables prefix exposure and defines only six public settings            |
| Public URLs                    | Earlier validation could accept embedded credentials or query tokens                                                     | Reject URL credentials, query parameters, and fragments without echoing values              |
| Unused source                  | TypeScript import graph from runtime/CLI roots, plus searches for external entry-point usage                             | Removed 13 unreachable source modules; remaining graph has no identified unreachable module |
| Duplicated configuration       | Two definitions of the client API base                                                                                   | Reuse `api-config.ts` from API and refresh paths                                            |
| Obsolete integrations          | Unused verification/provider flows and old provider setting/comment                                                      | Remove dead paths and stale Gemini setting; preserve current proof-based linking            |
| Documentation                  | Maintained Markdown guides contradicted current auth, uploads, jobs, and build status                                    | Align guides, configuration reference, commands, and architecture diagram with code         |

Local `.env` variants, private generated secrets, logs, and scratch files were not
published or removed. Public endpoint IDs, OAuth client IDs, discovery metadata,
and a dedicated browser basemap key are not server credentials. TURN credentials
are delivered only after authorized call joins and are visible to those callers.
See [configuration boundaries](configuration.md).

The XML and relationship entries in both historical Word records were also
checked for credential patterns and exact copies of the 13 private values, with
no findings. The documents themselves remain unchanged.

## Historical findings

The six redacted Gitleaks findings were:

- Four synthetic test/build credentials in environment-loading tests,
  `vitest.workspace.ts`, and the standalone smoke script.
- Two generated Next.js encryption keys in historical
  `.next/server/server-reference-manifest.json` commits `dd9a28d670a0` and
  `484a5a09f69b`.

Next.js is absent from the current runtime and `.next` is ignored. The historical
keys remain in Git objects. This audit does not establish that they were revoked,
that they were never deployed, or that old deployments are inaccessible. Any old
Next deployment needs its own retirement/rotation review. Shared history was not
rewritten. Real credential exposure would require revocation at its issuer, not
only a source deletion.

The history scan disabled text conversion to avoid the local Word-document diff
filter and used full redaction. Temporary detailed reports remain ignored.

## Removed code and retained coverage

Removed modules include the old provider connection form, old verification status
and service, two unused admin charts, an unused client type barrel, server config
and middleware barrels, obsolete OAuth/session route modules, old mail wrappers,
and the unused OAuth user service. The removed OAuth helper's email-linking path
was superseded by current explicit ownership checks.

Removed dead hooks/service exports for the obsolete connection flow and unused
metrics timeseries charts. Current admin metrics, authorization, and charts remain.
Resend tests now exercise `resendEmailVerification` and `/auth/email/resend`,
including same-account refresh retry, account-switch protection, and cooldown.
Tests for the two deleted chart components were removed with their dead code.

`src/server/planner-dev.ts` remains because the sibling Planner invokes it for
development authentication. Its apparent lack of a main import was not sufficient
evidence to delete it. CLI scripts and Lambda handlers were also treated as roots.
The static graph cannot prove the absence of all dynamically selected dead code.

## Compatible dependency updates

Applied npm's compatible fixes without `--force`; root version ranges were not
changed to new major releases. Moved Leaflet type packages to devDependencies.

| Package                             | Installed version after cleanup |
| ----------------------------------- | ------------------------------- |
| `proxy-addr`                        | 2.0.8                           |
| `body-parser`                       | 2.4.0                           |
| `qs`                                | 6.16.1                          |
| `zod`                               | 4.6.7                           |
| `ip-address`                        | 10.7.5                          |
| `react-router` / `react-router-dom` | 6.30.6                          |

Compatible transitive development packages were updated in the lockfile too.
The proxy patch addresses the published
[proxy-addr advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h).

## Deferred major migrations

The full audit snapshot still reports **15 affected package nodes: 11 moderate,
one high, and three critical**. These counts include dependency chains and are
not a count of independently exploitable application paths. Production dependency
findings remain for `react-router` and `react-router-dom`, both moderate.
Development-tool findings are not embedded server credentials, but still require
maintenance and controlled tool exposure.

| Migration              | Audit-suggested target snapshot         | Required validation                                                                 |
| ---------------------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| React Router 6 to 7    | `react-router-dom` 7.18.4               | Routing, auth redirects, protected pages, external launches, browser navigation     |
| Vite 5 to 8            | Vite 8.3.5 with compatible React plugin | Env isolation, production/prerender builds, assets, proxies, and browser checks     |
| Vitest/coverage 2 to 5 | Vitest and coverage 5.0.5               | Workspace/project config, mocks, pools, Mongo fixtures, live-suite opt-in, coverage |
| Tailwind 3 to 4        | Tailwind 4.3.3                          | CSS/PostCSS integration, theme utilities, responsive and visual checks              |
| lint-staged 13 to 17   | lint-staged 17.6.0                      | Windows hooks, staged formatting, partial-stage behavior, and Node compatibility    |

Targets are the audit's dated suggestions, not a promise that they are the latest
or that upgrading alone completes migration. Related remaining nodes include
`@vitest/mocker`, `vite-node`, `tinypool`, nested `esbuild`, `postcss-nested`,
`postcss-selector-parser`, `micromatch`, and nested `yaml`. Update and re-audit each
parent dependency chain. The root esbuild version differs from Vite's older
nested copy.

React Router findings include the
[open-redirect advisory](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) and
[SSR deserialization advisory](https://github.com/advisories/GHSA-337j-9hxr-rhxg).
Review applicability against this app's actual routing and deployment while
planning the upgrade. This cleanup does not claim those advisories are resolved.

## Validation for this pass

- Full Vitest run: **217 files passed, 1 skipped; 1,808 tests passed, 80 skipped**.
  Skips are the opt-in live Bedrock suite. No real AI calls were repeated for cleanup.
- Full ESLint and configured TypeScript checks passed.
- Isolated production client build passed; output had no private-value or canary matches.
- Server bundle and temporary-database production startup smoke passed.
- Lambda build and isolated runtime smoke passed, including OIDC, HTTP,
  realtime delivery, and cleanup checks.
- Public-setting guard tests: 13 passed, including real Vite bundling.
- Environment-loading, deployment, and template checks: 17 passed.
- Production SEO/prerender checks: 5 passed.
- Browser end-to-end checks: 30 passed across Chromium and Firefox using the
  built client and mocked API responses.

- Documentation checks: 27 maintained Markdown files, 138 local links, and 49
  npm script references checked without missing targets or unknown scripts.
- Architecture SVG and PNG were synchronized, rendered, and visually inspected.

No deployment, credential rotation, production data mutation, or history rewrite
was performed by this cleanup. Historical Word originals remain unchanged as
provenance. Live AWS, email, external apps, and cross-network TURN still require
[release acceptance](aws-acceptance.md).
