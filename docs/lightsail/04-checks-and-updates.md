# 4. Provider setup, testing and updates

## Resend

1. Open Resend > Domains > Add domain and enter `vetify.page`.
2. Copy its exact DNS records into the provider managing vetify.page. Preserve your existing records.
3. Wait for Resend to show the domain as verified.
4. Use AUTH_MAIL_FROM="Vetify <no-reply@vetify.page>" and MAIL_FROM="Vetify <professionals@vetify.page>".
5. Supply separate real API keys for AUTH_MAIL_API_KEY and MAIL_API_KEY; keys are not sender addresses.
6. On Ubuntu update `/etc/vetify/env.prod`, then `sudo systemctl restart vetify`.
7. Test auth and professional mail to an address other than the Resend account owner. Check inbox/spam and provider delivery logs.

Sender-domain verification does not create receiving email inboxes. Keep your existing support inbox until you separately configure domain email hosting. [Resend verification](https://resend.com/docs/dashboard/domains/introduction).

## Google

1. Open Google Cloud > the OAuth application > Credentials > its Web OAuth client (console sections may change).
2. Add authorized JavaScript origin `https://vetify.page` where required.
3. Add authorized redirect URI `https://vetify.page/api/v1/auth/google/callback`.
4. Add vetify.page to the application's authorized domains where required, configure the consent screen, and complete production publishing/verification requirements for its scopes.
5. Put its client ID/secret into the corresponding server fields. Restart Vetify and test.

## Facebook and TikTok

Register these exact HTTPS callback URLs in each enabled provider's app console:

```text
https://vetify.page/api/v1/auth/facebook/callback
https://vetify.page/api/v1/auth/tiktok/callback
```

Complete each provider's domain/application settings, review and live-mode requirements. A valid HTTPS address alone does not approve a provider application. Leave unused providers blank.

Sources: [Google OAuth web apps](https://developers.google.com/identity/protocols/oauth2/web-server), [Facebook Login](https://developers.facebook.com/docs/facebook-login/web/), [TikTok Login Kit](https://developers.tiktok.com/doc/login-kit-web).

## Acceptance checks before inviting users

- Existing professional account keeps its ID, role, approved name and console access.
- Local signup sends a six-digit code; resend waits 60 seconds; old code fails after resend; code expires in five minutes.
- Duplicate signup and unregistered-login messages remain correct.
- Google login, local login and explicitly linked methods open the same account.
- Password reset, login refresh, logout and protected pages behave correctly.
- Private uploads stay private until authorized/approved; the built PDF worker works.
- Chat, notifications and calls work between two accounts. Test calls on different networks; configure a TURN relay if needed.
- Reminders, appointment completion and document checks continue after restarting the service.
- Test memory/CPU under expected usage. This single server is not high availability.

## Update the deployment

On Windows, from the project folder:

```powershell
npm.cmd run release:prod
npm.cmd run test:release
scp -i $vetifySshKey .\dist\vetify-release.tar.gz "ubuntu@${vetifyServerIp}:~/vetify-release.tar.gz"
ssh -i $vetifySshKey "ubuntu@$vetifyServerIp"
```

On Ubuntu:

```bash
tar -xzf ~/vetify-release.tar.gz -C ~/vetify-upload config
sudo bash ~/vetify-upload/config/install-release.sh ~/vetify-release.tar.gz
```

The installer replaces the supplied service/Caddy configuration, so keep intentional config changes in the repository. Credentials remain in `/etc/vetify/env.prod` across releases. Rebuild frontend changes to VITE\_ settings; restarting Node cannot change already-built browser code.

## Roll back application files manually

```bash
ls -1 /opt/vetify/releases
readlink -f /opt/vetify/current
```

Choose a previous known-good directory printed by ls. Substitute its exact full path below, then verify it before switching:

```bash
previous_release='/opt/vetify/releases/REPLACE_WITH_KNOWN_GOOD_DIRECTORY'
test -f "$previous_release/server/index.js"
test -f "$previous_release/public/index.html"
```

Continue only if both checks succeed. The switch replaces a symlink, not the release directory:

```bash
sudo ln -s "$previous_release" /opt/vetify/.current-rollback
sudo mv -Tf /opt/vetify/.current-rollback /opt/vetify/current
sudo systemctl restart vetify
sudo bash /opt/vetify/current/config/verify.sh
```

Rolling back files does not undo database writes or environment changes. Keep the database backup and previous secret configuration separately. The fixed Caddy paths use the current symlink, so compatible app rollbacks do not require rewriting it.

## Cost and lifecycle

Check AWS Billing/credits weekly and set a reminder before your free-plan expiry. Unused credits do not extend a six-month free account plan. Back up or arrange paid hosting before expiry. [AWS account plans](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html).

The base 2 GB server price is $12/month, but snapshots, extra services, taxes or transfer overages can add costs. Stopped Lightsail instances still accrue charges. Attached static IPs are included; unattached ones can cost extra. [Pricing](https://aws.amazon.com/lightsail/pricing/), [billing](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-frequently-asked-questions-faq-billing-and-account-management.html).
