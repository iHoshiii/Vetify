// The MediaPipe runtime is 12 MB of WebAssembly, so it is copied out of node_modules at
// build time instead of being committed. Only the SIMD build is copied: every browser
// that can reach a camera in 2026 has SIMD, and a browser without it gets no detector
// and the manual shutter, which is the same path a denied camera takes.
import { copyFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const FILES = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm'];
const from = path.resolve('node_modules/@mediapipe/tasks-vision/wasm');
const to = path.resolve('public/mediapipe/wasm');

async function sizeOf(file) {
  try {
    return (await stat(file)).size;
  } catch {
    return -1;
  }
}

await mkdir(to, { recursive: true });

for (const name of FILES) {
  const source = path.join(from, name);
  const target = path.join(to, name);

  if ((await sizeOf(source)) < 0) {
    console.error(`[mediapipe] missing ${source}. Run npm install first.`);
    process.exit(1);
  }

  if ((await sizeOf(source)) === (await sizeOf(target))) continue;
  await copyFile(source, target);
  console.log(`[mediapipe] copied ${name}`);
}
