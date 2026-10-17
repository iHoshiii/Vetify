import assert from 'node:assert/strict';

for (const [path, status, kind] of [
  ['/', 200, 'text/html'],
  ['/login', 200, 'text/html'],
  ['/api/v1/health', 200, 'application/json'],
  ['/api/v1/appointments', 401, 'application/json'],
  ['/api/v1/does-not-exist', 404, 'application/json'],
]) {
  let failure;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(`https://vetify.page${path}`, {
        signal: AbortSignal.timeout(40000),
      });
      assert.equal(response.status, status, `Unexpected status for ${path}`);
      assert.ok(response.headers.get('content-type')?.includes(kind));
      if (path === '/api/v1/health') assert.equal((await response.json()).db, 'connected');
      else await response.arrayBuffer();
      failure = undefined;
      break;
    } catch (error) {
      failure = error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  if (failure) throw failure;
  console.log(`[deploy] Passed ${path}`);
}
