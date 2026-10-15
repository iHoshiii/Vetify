import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const bundle = await build({
  entryPoints: ['src/client/pages/call/peer.ts'],
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'iife',
  globalName: 'VetifyMedia',
});
const server = createServer((req, res) => {
  res.setHeader('Content-Type', req.url === '/peer.js' ? 'text/javascript' : 'text/html');
  res.end(req.url === '/peer.js' ? bundle.outputFiles[0].text : '<script src="/peer.js"></script>');
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });
  const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async () => {
    const peers = [];
    const streams = [];
    const remotes = [];
    const connections = [];
    const nativePeer = globalThis.RTCPeerConnection;
    globalThis.RTCPeerConnection = class extends nativePeer {
      constructor(...args) {
        super(...args);
        connections.push(this);
      }
    };
    const connected = [false, false];
    const waiting = [[], []];
    let reordered = 0;
    let earlyCandidates = 0;
    for (let i = 0; i < 2; i++) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streams.push(stream);
      peers.push(
        globalThis.VetifyMedia.createPeer({
          stream,
          iceServers: [],
          polite: i === 0,
          onConnected: () => {
            connected[i] = true;
          },
          onClosed: () => {
            connected[i] = false;
          },
          onRemote: (remote) => {
            remotes[i] = remote;
            const video = globalThis.document.createElement('video');
            video.autoplay = true;
            video.muted = true;
            video.srcObject = remote;
            globalThis.document.body.append(video);
          },
          sendSignal: (signal) => {
            const target = 1 - i;
            const deliver = () => {
              if (signal.candidate && !connections[target]?.remoteDescription) earlyCandidates++;
              if (peers[target]) void peers[target].handleSignal(signal);
              else waiting[target].push(signal);
            };
            if (signal.description) {
              reordered++;
              setTimeout(deliver, 100);
            } else deliver();
          },
        })
      );
      for (const signal of waiting[i].splice(0)) void peers[i].handleSignal(signal);
    }
    globalThis.mediaTest = {
      connected,
      streams,
      remotes,
      connections,
      reordered: () => reordered,
      earlyCandidates: () => earlyCandidates,
      close: () => {
        peers.forEach((peer) => peer.close());
        streams.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
      },
    };
  });
  await page.waitForFunction(() => globalThis.mediaTest.connected.every(Boolean), undefined, {
    timeout: 20_000,
  });
  const result = await page.evaluate(async () => {
    const test = globalThis.mediaTest;
    const remoteTracks = test.remotes.map((stream) =>
      stream
        .getTracks()
        .map((track) => track.kind)
        .sort()
    );
    let frames = [];
    const deadline = Date.now() + 20_000;
    do {
      frames = await Promise.all(
        test.connections.map(async (connection) => {
          const stats = [...(await connection.getStats()).values()];
          return Math.max(
            0,
            ...stats
              .filter((item) => item.type === 'inbound-rtp' && item.kind === 'video')
              .map((item) => item.framesDecoded ?? 0)
          );
        })
      );
      if (frames.length === 2 && frames.every((count) => count >= 5)) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    } while (Date.now() < deadline);
    test.streams[0].getAudioTracks()[0].enabled = false;
    const muted = !test.streams[0].getAudioTracks()[0].enabled;
    test.streams[0].getAudioTracks()[0].enabled = true;
    const value = {
      connected: test.connected,
      remoteTracks,
      frames,
      muted,
      reorderedDescriptions: test.reordered(),
      earlyCandidates: test.earlyCandidates(),
    };
    test.close();
    return value;
  });
  assert.deepEqual(result.remoteTracks, [
    ['audio', 'video'],
    ['audio', 'video'],
  ]);
  assert.ok(
    result.frames.length === 2 && result.frames.every((frames) => frames >= 5),
    JSON.stringify(result)
  );
  assert.ok(result.muted && result.earlyCandidates > 0);
  console.log('Real Chromium WebRTC media passed:', JSON.stringify(result));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
