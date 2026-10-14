#!/usr/bin/env bash
set -euo pipefail
if [[ $(id -u) -ne 0 ]]; then echo 'Run with sudo bash bootstrap.sh'; exit 1; fi
source /etc/os-release
if [[ $ID != ubuntu || $VERSION_ID != 24.04 ]]; then
  echo 'This setup is for Ubuntu 24.04.'; exit 1
fi
apt-get update
apt-get install -y curl ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https
curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/vetify-node-setup.sh
bash /tmp/vetify-node-setup.sh
apt-get install -y nodejs
if [[ $(node -p 'process.versions.node.split(".")[0]') != 24 ]]; then
  echo 'Node 24 is required.'; exit 1
fi
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key -o /tmp/vetify-caddy.asc
gpg --batch --yes --dearmor -o /tmp/vetify-caddy.gpg /tmp/vetify-caddy.asc
install -m 0644 /tmp/vetify-caddy.gpg /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt -o /tmp/vetify-caddy.list
install -m 0644 /tmp/vetify-caddy.list /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy
id vetify >/dev/null 2>&1 || useradd --system --user-group --create-home --shell /usr/sbin/nologin vetify
install -d -m 0755 /opt/vetify /opt/vetify/releases
install -d -m 0750 -o root -g vetify /etc/vetify
echo 'Installed Node 24 and Caddy. Next create /etc/vetify/env.prod and install the release.'
