import dns from 'node:dns';

/**
 * Node resolves names through two different paths, and only one of them uses the
 * operating system.
 *
 * Plain hostname lookups — `dns.lookup()`, and so every socket the driver ever
 * opens — go through getaddrinfo, the same resolver the rest of the machine uses.
 * SRV and TXT lookups do not. Those are answered by the c-ares resolver bundled
 * into Node, which reads the machine's nameservers itself instead of asking the
 * OS for them.
 *
 * When that read comes back empty — seen on Windows network stacks, under VPN
 * clients, and inside containers — c-ares falls back to 127.0.0.1 without
 * saying so. Nothing is listening there, so every SRV and TXT query fails with
 * ECONNREFUSED while nslookup and the browser carry on working perfectly. That
 * split is what makes the failure so hard to place.
 *
 * `mongodb+srv://` has to read an SRV record and a TXT record before it knows
 * which host to dial, so on such a machine the driver never opens a socket at
 * all. DNS_SERVERS exists for exactly that case: it hands c-ares the resolvers
 * it could not find on its own.
 */

/** 127.0.0.0/8 or ::1 — the addresses c-ares invents when it finds no config. */
const LOOPBACK = /^(?:127\.|::1$)/;

function usingLoopbackFallback(): boolean {
  const servers = dns.getServers();
  return servers.length > 0 && servers.every((server) => LOOPBACK.test(server));
}

/**
 * Point c-ares at an explicit resolver list. A no-op when DNS_SERVERS is unset,
 * which is the normal case: a healthy machine needs no help here.
 */
export function applyDnsServers(servers: readonly string[]): void {
  if (servers.length === 0) return;

  dns.setServers([...servers]);
  console.log(`[dns] SRV/TXT resolver set to ${servers.join(', ')}`);
}

/**
 * A follow-up line for a connection failure whose symptoms match the fallback
 * above. Only ever consulted after something has already failed, so a machine
 * deliberately pointed at a local resolver — Pi-hole, dnsmasq, dnscrypt — never
 * gets nagged about it while that resolver is up and answering.
 */
export function dnsFallbackHint(err: Error): string | null {
  if (!/querySrv|queryTxt/.test(err.message)) return null;
  if (!usingLoopbackFallback()) return null;

  return (
    `[dns] Node is sending SRV/TXT queries to ${dns
      .getServers()
      .join(', ')}, where nothing answers.\n` +
    "[dns] The OS resolves names fine; it is Node that could not read the machine's nameservers.\n" +
    "[dns] Set DNS_SERVERS in .env to this network's resolvers (or a public one, e.g. 1.1.1.1)."
  );
}
