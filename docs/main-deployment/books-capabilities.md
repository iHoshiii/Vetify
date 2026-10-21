# Books worker credential

Main implements `POST /api/v1/auth/books-capabilities` for Books worker approval
checks. This does not implement Books browser sign-in, PKCE handoff or version-2
user-token introspection; those remain separate integration requirements.

## Get MAIN_AUTH_SERVICE_TOKEN

Run `npm run auth:books:secrets` in the main Vetify repository. It creates the
ignored `.tmp/books-capability-secrets.json` file and prints only its location.
It refuses to overwrite an existing file. The credential expires in 90 days.
Generate separate credentials for development and production.

1. Copy `books.MAIN_AUTH_SERVICE_TOKEN` from that file into the Books Vercel
   **server** environment as `MAIN_AUTH_SERVICE_TOKEN`.
2. Copy the two fields under `main` into main's backend environment:
   `BOOKS_CAPABILITY_TOKEN_SHA256` and `BOOKS_CAPABILITY_TOKEN_EXPIRES_AT`.
   Main stores the SHA-256 digest rather than the raw bearer credential.
3. For AWS SAM, merge those two fields into the existing application secret,
   preserving its other fields. Deploy with `BooksCapabilitiesEnabled=true`.
   The default is false, so existing deployments need no new secret fields.
   Increment `ConfigRevision` when changing these values to refresh injection.
4. Deploy main with this change, and redeploy Books with its credential.
   Books' `MAIN_AUTH_ORIGIN` must equal main's public `SERVER_URL` origin.

For local use, copy the main fields into main's `.env` and the Books field into
Books' server environment, then restart both servers. Generating the file alone
does not configure or deploy either application. Never use a `VITE_` variable.

For rotation, move the private generated file to secure storage, rerun the
generator, and replace both sides' configuration. The previous token becomes
invalid as soon as main uses the new hash. Removing both main fields disables
the endpoint with 503; an expired or incorrect token returns 401. Rotate before
the generated UTC expiry timestamp. The raw token is not a main login token or
main signing secret, and authorizes only this capability lookup endpoint.

## Contract

Send `Authorization: Bearer <MAIN_AUTH_SERVICE_TOKEN>` and JSON
`{"userId":"<24-character main user ID>","audience":"vetify-books"}`.
Other audiences and additional fields are rejected. Responses use
`Cache-Control: no-store`. A successful response is:

```json
{
  "version": 2,
  "issuer": "https://vetify.page",
  "audience": "vetify-books",
  "user": { "id": "0123456789abcdef01234567", "role": "professional", "status": "active" },
  "emailVerified": true,
  "professional": { "status": "verified" },
  "validUntil": "<UTC timestamp at most 30 seconds ahead>"
}
```

The endpoint rereads the main account and professional application. It refuses
disabled/deleted accounts and unverified email. It maps main's `interview` to
Books' `pending` and main's `suspended` professional approval to `revoked`.
Accounts without an application have no `professional` field. Books must still
require both role `professional` and approval `verified`, verify the returned
user ID, and recheck immediately before publication. A role alone grants nothing.
The worker lookup deliberately does not require an author browser session.
Validity is capped by the service credential's expiry and 30 seconds.

Route tests cover credential rejection, expiry/rotation, audience, data
minimization, disabled/deleted authors, approval status and immediate revocation.
Joint production Books publication and sign-in acceptance are still required.
