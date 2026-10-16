import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cache = join(root, 'node_modules/.cache');
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash';
const posix = (path) =>
  process.platform === 'win32'
    ? execFileSync(bash, ['--noprofile', '--norc', '-c', 'cygpath -u "$1"', '--', path], {
        encoding: 'utf8',
      }).trim()
    : path;
async function scenario(success, previous, check) {
  await mkdir(cache, { recursive: true });
  const temp = await mkdtemp(join(cache, 'install-release-'));
  try {
    const paths = {
      opt: join(temp, 'opt'),
      env: join(temp, 'env'),
      system: join(temp, 'system'),
      caddy: join(temp, 'caddy'),
      bin: join(temp, 'bin'),
      stage: join(temp, 'stage'),
      log: join(temp, 'systemctl.log'),
    };
    for (const folder of [
      paths.opt,
      join(paths.opt, 'releases'),
      paths.env,
      paths.system,
      paths.caddy,
      paths.bin,
      paths.stage,
    ])
      await mkdir(folder, { recursive: true });
    await writeFile(join(paths.env, 'env.prod'), 'NODE_ENV=production\n');
    for (const [name, body] of Object.entries({
      id: 'echo 0',
      chown: 'exit 0',
      runuser: 'exit 0',
      caddy: 'exit 0',
      install: 'cp "${@: -2:1}" "${@: -1}"',
      systemctl: 'printf "%s\\n" "$*" >> "$VETIFY_INSTALL_LOG"',
    }))
      await writeFile(join(paths.bin, name), `#!/bin/bash\n${body}\n`, { mode: 0o755 });
    const files = {
      'server/index.js': 'new application',
      'server/package-lock.json': '{}',
      'public/index.html': 'new website',
      'config/Caddyfile': 'config',
      'config/vetify.service': 'service',
      'config/verify.sh': `#!/bin/bash\nexit ${success ? 0 : 1}\n`,
    };
    for (const [name, content] of Object.entries(files)) {
      await mkdir(dirname(join(paths.stage, name)), { recursive: true });
      await writeFile(join(paths.stage, name), content);
    }
    const archive = join(temp, 'release.tar.gz');
    execFileSync('tar', ['-czf', archive, '-C', paths.stage, 'server', 'public', 'config']);
    let old;
    if (previous) {
      old = join(paths.opt, 'releases', 'old');
      await mkdir(old);
      await symlink(
        old,
        join(paths.opt, 'current'),
        process.platform === 'win32' ? 'junction' : 'dir'
      );
    }
    let script = await readFile(join(root, 'deploy/lightsail/install-release.sh'), 'utf8');
    for (const [name, replacement] of Object.entries({
      '/opt/vetify': paths.opt,
      '/etc/vetify': paths.env,
      '/etc/systemd/system': paths.system,
      '/etc/caddy': paths.caddy,
    }))
      script = script.replaceAll(name, posix(replacement));
    const shellBin = "'" + posix(paths.bin).replaceAll("'", "'\\''") + "'";
    script = `export PATH=${shellBin}:/usr/bin:/bin\n${script}`;
    const target = join(temp, 'installer.sh');
    await writeFile(target, script);
    const result = spawnSync(bash, ['--noprofile', '--norc', posix(target), posix(archive)], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${posix(paths.bin)}:/usr/bin:/bin`,
        MSYS: 'winsymlinks:nativestrict',
        VETIFY_INSTALL_LOG: posix(paths.log),
      },
    });
    await check({ result, paths, old });
  } finally {
    assert.equal(dirname(temp), cache);
    await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
test(
  'first failed deployment stops the service without creating a self-referencing current link',
  { skip: !existsSync(bash) },
  async () => {
    await scenario(false, false, async ({ result, paths }) => {
      assert.equal(result.status, 1, result.stderr);
      assert.match(await readFile(paths.log, 'utf8'), /stop vetify/);
      const target = await readlink(join(paths.opt, 'current'));
      assert.notEqual(resolve(paths.opt, target), join(paths.opt, 'current'));
    });
  }
);
test(
  'failed update restores the previous application release',
  { skip: !existsSync(bash) },
  async () => {
    await scenario(false, true, async ({ result, paths, old }) => {
      assert.equal(result.status, 1, result.stderr);
      assert.equal(await realpath(join(paths.opt, 'current')), await realpath(old));
      assert.match(result.stdout, /Restored the previous release/);
    });
  }
);
test(
  'successful deployment activates new files and reloads Caddy after readiness',
  { skip: !existsSync(bash) },
  async () => {
    await scenario(true, true, async ({ result, paths, old }) => {
      assert.equal(result.status, 0, result.stderr);
      assert.notEqual(await realpath(join(paths.opt, 'current')), await realpath(old));
      assert.equal(
        await readFile(join(paths.opt, 'current/server/index.js'), 'utf8'),
        'new application'
      );
      assert.match(await readFile(paths.log, 'utf8'), /reload-or-restart caddy/);
    });
  }
);
