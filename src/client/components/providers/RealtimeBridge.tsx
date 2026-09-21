import { useRealtime } from '@/hooks/useRealtime';

// Mounts the socket-to-cache bridge once, above the router, so it covers the public site and both consoles alike. Renders nothing.
export default function RealtimeBridge() {
  useRealtime();
  return null;
}
