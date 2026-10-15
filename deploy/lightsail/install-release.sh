#!/usr/bin/env bash
set -euo pipefail
if [[ $(id -u) -ne 0 ]]; then echo 'Run with sudo bash install-release.sh ARCHIVE'; exit 1; fi
if [[ $# -ne 1 || ! -f $1 ]]; then echo 'Supply the release .tar.gz path.'; exit 1; fi
if [[ ! -f /etc/vetify/env.prod ]]; then echo 'Create /etc/vetify/env.prod first.'; exit 1; fi
archive=$(readlink -f -- "$1")
while IFS= read -r name; do
  if [[ $name == /* || "/$name/" == *'/../'* || ! $name =~ ^(server|public|config)(/|$) ]]; then
    echo "Unexpected archive entry: $name"; exit 1
  fi
done < <(tar -tzf "$archive")
if [[ -e /opt/vetify/current && ! -L /opt/vetify/current ]]; then
  echo '/opt/vetify/current must be a symlink, not a directory.'; exit 1
fi
release=$(mktemp -d "/opt/vetify/releases/$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")
chmod 0755 "$release"
tar --no-same-owner --no-same-permissions -xzf "$archive" -C "$release"
for required in server/index.js server/package-lock.json public/index.html config/verify.sh config/Caddyfile config/vetify.service; do
  [[ -f "$release/$required" ]] || { echo "Release missing $required"; exit 1; }
done
chown -R vetify:vetify "$release/server"
runuser -u vetify -- bash -c 'cd "$1"; exec npm ci --omit=dev --no-audit --no-fund' bash "$release/server"
chown -R root:vetify "$release/server"
previous=''
if [[ -L /opt/vetify/current ]]; then previous=$(readlink -f /opt/vetify/current || true); fi
activate() {
  ln -s "$1" /opt/vetify/.current-next
  mv -Tf /opt/vetify/.current-next /opt/vetify/current
}
if [[ -e /opt/vetify/.current-next || -L /opt/vetify/.current-next ]]; then
  echo 'A pending .current-next exists. Check another deployment is not running.'; exit 1
fi
caddy validate --config "$release/config/Caddyfile"
activate "$release"
install -m 0644 "$release/config/vetify.service" /etc/systemd/system/vetify.service
install -m 0644 "$release/config/Caddyfile" /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable vetify caddy
systemctl restart vetify
if ! bash "$release/config/verify.sh"; then
  if [[ -n $previous && -d $previous ]]; then
    activate "$previous"
    systemctl restart vetify
    echo "Restored the previous release: $previous"
  else
    systemctl stop vetify
  fi
  exit 1
fi
systemctl reload-or-restart caddy
echo "Installed release: $release"
echo 'Open https://vetify.page and test signup, login, uploads, chat and calls.'
