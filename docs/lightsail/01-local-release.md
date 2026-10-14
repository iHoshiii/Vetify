# 1. Build on Windows

Run these commands in Windows PowerShell, not in the Lightsail SSH window. `npm.cmd` avoids the PowerShell npm.ps1 execution-policy problem on this computer.

## Open the project

```powershell
Set-Location -LiteralPath 'C:\Users\Administrator\OneDrive\Desktop\Vetify'
node --version
npm.cmd --version
```

Node must report `v24.x.x`. Install Node 24 if needed, then reopen PowerShell.

## Create the private production file

```powershell
if (-not (Test-Path -LiteralPath '.\env.prod')) {
    Copy-Item -LiteralPath '.\env.prod.example' -Destination '.\env.prod'
}
notepad.exe .\env.prod
```

This preserves an existing env.prod. Never upload `.env`, publish env.prod, or paste credentials into chat.

Keep the public settings below. Caddy serves both the website and API on the same domain:

```dotenv
NODE_ENV=production
PORT=8000
CLIENT_ORIGIN=https://vetify.page
SERVER_URL=https://vetify.page
OAUTH_SUCCESS_REDIRECT=https://vetify.page/auth/callback
OAUTH_FAILURE_REDIRECT=https://vetify.page/login?error=oauth
VITE_API_URL=/api/v1
```

Fill the remaining server secrets locally or later on Ubuntu. The frontend builder reads only `VITE_API_URL` and the optional public `VITE_CARTO_KEY`, so blank backend secrets do not prevent packaging.

## Install dependencies and build

```powershell
npm.cmd ci
npm.cmd run release:prod
```

Expected output: `dist\vetify-release.tar.gz`. The command copies MediaPipe assets, builds production React without reading local .env, typechecks/bundles the server and adjacent PDF worker, generates a runtime-only lockfile and packs the release.

To build using the public sample instead of a private production file:

```powershell
npm.cmd run release:prod -- --env-file=env.prod.example
```

Do not upload source files or Windows node_modules. Do not run Vite's development server on the public server.

## Verify the release

```powershell
node --test scripts/__tests__/env-loading.test.mjs scripts/__tests__/install-release.test.mjs
npm.cmd run test:release
tar -tzf .\dist\vetify-release.tar.gz | Select-Object -First 20
```

The smoke check installs only runtime dependencies in a temporary folder, parses a PDF through the built worker, starts the built server against temporary MongoDB and checks health/auth. It uses synthetic credentials and does not touch your main database or send email.

The archive contains `server/`, `public/` and `config/`. It must not contain `.env`, `env.prod`, private keys or node_modules.

## Prepare SSH variables after creating the AWS server

In Lightsail choose your account menu > Account > SSH keys > Default keys. Download the Singapore default private key. Keep it outside this repository.

Set the real values in your PowerShell session:

```powershell
$vetifyServerIp = 'REPLACE_WITH_LIGHTSAIL_STATIC_IPV4'
$vetifySshKey = 'C:\Users\Administrator\Downloads\LightsailDefaultKey-ap-southeast-1.pem'
Test-Path -LiteralPath $vetifySshKey
```

The last command must return `True`. The key path may differ if you selected a custom key when creating the instance.

Go to [AWS and DNS setup](02-aws-and-dns.md) before running uploads.
