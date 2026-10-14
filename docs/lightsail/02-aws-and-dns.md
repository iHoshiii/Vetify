# 2. AWS console and DNS

Use your own AWS account with permission to create Lightsail resources. Check that the selected service/plan is available under your account's Free plan. Do not upgrade the account merely to follow a button if you have not reviewed the billing consequences.

## Budget and credits

1. Sign in to AWS and search for **Billing and Cost Management**.
2. Open **Credits**. Record the awarded balance and expiry, not the maximum you might earn.
3. Open **Budgets > Create budget > Use a template > Monthly cost budget**.
4. Name it `vetify-monthly`, choose a monitoring amount such as $20, and enter your email.
5. Review and create. An alert is not a spending cap.
6. Complete the credit activities actually shown in your **Explore AWS** widget. Delete temporary learning resources afterward.

## Create the server

1. Search for **Lightsail** and open it.
2. Choose **Instances > Create instance**.
3. Region: **Singapore (ap-southeast-1)**.
4. Platform: **Linux/Unix**. Blueprint: **OS Only > Ubuntu 24.04**.
5. Select public IPv4/dual-stack networking, not IPv6-only.
6. Select the **2 GB memory, $12/month Linux instance** plan. Confirm the current displayed price.
7. Use the default regional SSH key, or record which custom key you selected.
8. Name the instance `vetify-prod`, then create it.
9. Wait for **Running**. Do not create a Lightsail database or load balancer.

## Attach a static IP

1. Open **Networking > Create static IP**.
2. Select Singapore and attach it to `vetify-prod`.
3. Name it `vetify-prod-ip` and create it.
4. Copy the resulting public IPv4 into your PowerShell `$vetifyServerIp` variable.

An attached Lightsail static IP is included. An unattached IP can incur separate charges. The instance itself continues accruing charges when stopped; deleting it ends its instance charges.

## Firewall

1. Open **Instances > vetify-prod > Networking > IPv4 firewall**.
2. Allow HTTP TCP 80 from all IPv4 addresses.
3. Allow HTTPS TCP 443 from all IPv4 addresses.
4. Edit SSH TCP 22: restrict to your current public IPv4 and enable **Allow Lightsail browser SSH/RDP**.
5. Leave port 8000 closed publicly. Caddy reaches it on the same server.
6. Use IPv4 DNS initially. If IPv6 is enabled, do not publish an AAAA record until its firewall/routing is deliberately configured.

## Domain records

Keep the existing DNS provider for vetify.page. You do not need to transfer the domain or change nameservers.

1. Open its domain DNS-management screen, using **Add DNS Records** in the registrar dashboard if that provider manages your DNS.
2. Add/replace the apex **A** record: Host `@`, Value the static IPv4, default TTL.
3. Add/replace **CNAME**: Host `www`, Value `vetify.page`, default TTL.
4. Remove conflicting parking A/CNAME/AAAA entries for these names. Preserve mail and verification records.
5. Check whether the DNS form automatically appends `.vetify.page` before entering full record names.
6. In PowerShell run:

```powershell
Resolve-DnsName vetify.page -Type A
Resolve-DnsName www.vetify.page
```

Both must lead to the static IP. Propagation can take time; wait for correct results before HTTPS setup. `api.vetify.page` is not needed initially.

## MongoDB Atlas

1. Open the Atlas project containing the **main Vetify accounts**, not the Meal Planner project.
2. Open **Security > Network Access > Add IP Address** (labels can vary).
3. Add the Lightsail static IPv4 with a description such as `Vetify production server`.
4. Check the database user and its required permissions under **Database Access**.
5. Put the matching URI, with explicit `/vetify` and URL-encoded password, in the private production file.
6. Keep a database backup before the first production deployment; index creation and existing scanners will run against the selected database.

Go to [Ubuntu installation](03-server-install.md).

Sources: [Lightsail instance](https://docs.aws.amazon.com/lightsail/latest/userguide/how-to-create-amazon-lightsail-instance-virtual-private-server-vps.html), [static IP](https://docs.aws.amazon.com/lightsail/latest/userguide/lightsail-create-static-ip.html), [firewall](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-editing-firewall-rules.html), [billing](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-frequently-asked-questions-faq-billing-and-account-management.html).
