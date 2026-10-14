# 3. Upload and install

Commands labelled PowerShell run on Windows. Commands labelled Ubuntu run in Lightsail's **Connect using SSH** terminal, or an SSH connection to the server. The Ubuntu account username is `ubuntu`.

## Upload from Windows PowerShell

After completing guides 1 and 2, run these in your existing project PowerShell window:

```powershell
scp -i $vetifySshKey .\dist\vetify-release.tar.gz "ubuntu@${vetifyServerIp}:~/vetify-release.tar.gz"
ssh -i $vetifySshKey "ubuntu@$vetifyServerIp"
```

At first connection, verify the host fingerprint using the instance's trusted browser SSH terminal (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`) before accepting the key shown by your local SSH client. Never send your .pem key to the server.

## Extract only setup files on Ubuntu

```bash
mkdir -p ~/vetify-upload
tar -xzf ~/vetify-release.tar.gz -C ~/vetify-upload config
sudo bash ~/vetify-upload/config/bootstrap.sh
node --version
caddy version
```

The bootstrap installs Node 24 from NodeSource, Caddy from its official repository, the `vetify` service account and server directories. It targets Ubuntu 24.04 and runs only when invoked by you. Node must report v24.x.x.

## Create the production file on Ubuntu

```bash
sudo nano /etc/vetify/env.prod
```

Paste the completed contents of your private local env.prod, or fill the repository's env.prod.example manually. Do not include the PEM key or AWS account credentials. The single-server setup does not need AWS access keys.

These values must remain:

```dotenv
NODE_ENV=production
PORT=8000
CLIENT_ORIGIN=https://vetify.page
SERVER_URL=https://vetify.page
OAUTH_SUCCESS_REDIRECT=https://vetify.page/auth/callback
OAUTH_FAILURE_REDIRECT=https://vetify.page/login?error=oauth
```

Supply the main database URI, JWT_SECRET_ACCESS, GEMINI_API_KEY and separate mail keys. Supply OAUTH_STATE_SECRET and the credentials for enabled providers. Blank optional provider credentials disable that provider.

To generate independent signing secrets, run this twice in the Ubuntu terminal and copy each result into the corresponding file field; do not post the results in chat:

```bash
node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'
```

Save nano with **Ctrl+O**, **Enter**, then exit with **Ctrl+X**. Restrict permissions:

```bash
sudo chown root:vetify /etc/vetify/env.prod
sudo chmod 0640 /etc/vetify/env.prod
```

Use AUTH_MAIL_TRANSPORT=http and MAIL_TRANSPORT=http. The From values require a Resend-verified domain. The code never substitutes the professional API key for the auth key. No local .env is uploaded or consulted in production.

## Install and activate on Ubuntu

```bash
sudo bash ~/vetify-upload/config/install-release.sh ~/vetify-release.tar.gz
```

The installer extracts a dated release under `/opt/vetify/releases`, installs Linux runtime dependencies using npm ci, sets `/opt/vetify/current`, installs the service/Caddy configs, starts Node, requires connected MongoDB, then reloads Caddy. It keeps older releases and restores the previous application release if the readiness check fails. Initial deployment failure stops the app for troubleshooting.

Installation can take several minutes. Do not launch concurrent installations. Backend restarts can interrupt calls/chat.

## Check the result

```bash
sudo systemctl status vetify --no-pager
sudo systemctl status caddy --no-pager
curl -fsS http://127.0.0.1:8000/api/v1/health
curl -I https://vetify.page
```

Both services should be active, health should show db=connected, and the HTTPS website should respond. Your local backend health route always returns HTTP 200, so db=connected is the important extra check.

Open `https://vetify.page`, `https://vetify.page/login`, and `https://www.vetify.page` in the browser. Login must display after a page refresh; www redirects to the main domain.

Caddy obtains HTTPS certificates automatically when DNS and ports 80/443 are correct. No CloudFront, ACM export, or load balancer is needed. An ACM certificate you already requested is not used by this setup.

## Troubleshooting

```bash
sudo journalctl -u vetify -n 100 --no-pager
sudo journalctl -u caddy -n 100 --no-pager
sudo systemctl restart vetify
```

Mongo errors: check the URI/database user/Atlas IP entry. Email errors: check the matching API key and verified From domain. HTTPS errors: check A/CNAME records, conflicting AAAA records and open ports. Share error text with secrets redacted; never paste the production file.

Go to [Provider setup, tests and updates](04-checks-and-updates.md).
