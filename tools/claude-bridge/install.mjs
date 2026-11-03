#!/usr/bin/env node
// Registers the dev bridge with Chrome. Usage: npm run bridge:install | npm run bridge:uninstall
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST_NAME = 'com.summaryse.claude_bridge';
const EXTENSION_ID = 'iahggcfekfiaknhonibkhibgjebghjjc'; // matches src/lib/dev-extension-key.ts

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const wrapperPath = join(here, '.bin', 'host.sh');

const chromeDirs = {
  darwin: [
    join(homedir(), 'Library/Application Support/Google/Chrome/NativeMessagingHosts'),
    join(homedir(), 'Library/Application Support/Chromium/NativeMessagingHosts'),
  ],
  linux: [
    join(homedir(), '.config/google-chrome/NativeMessagingHosts'),
    join(homedir(), '.config/chromium/NativeMessagingHosts'),
  ],
}[platform()];

if (!chromeDirs) {
  console.error(`The dev bridge installer supports macOS and Linux, not ${platform()}.`);
  process.exit(1);
}

// `npm run dev` uses this profile (see wxt.config.ts); Chrome looks for hosts inside it too.
const targets = [...chromeDirs, join(repoRoot, '.chrome-profile/NativeMessagingHosts')].map((dir) =>
  join(dir, `${HOST_NAME}.json`),
);

if (process.argv.includes('--uninstall')) {
  for (const file of [...targets, wrapperPath]) rmSync(file, { force: true });
  console.log('Removed the Claude dev bridge.');
  process.exit(0);
}

function which(bin) {
  try {
    return execFileSync('/usr/bin/which', [bin], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const claudePath = which('claude');
if (!claudePath) {
  console.error('Claude Code CLI not found on PATH. Install it and log in first.');
  process.exit(1);
}

// Chrome launches hosts with a minimal PATH, so pin absolute paths in a wrapper.
mkdirSync(dirname(wrapperPath), { recursive: true });
writeFileSync(
  wrapperPath,
  `#!/bin/sh\nexport CLAUDE_BIN=${JSON.stringify(claudePath)}\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(join(here, 'host.mjs'))} "$@"\n`,
);
chmodSync(wrapperPath, 0o755);

const manifest = {
  name: HOST_NAME,
  description: 'Summaryse dev bridge to the local Claude Code CLI',
  path: wrapperPath,
  type: 'stdio',
  allowed_origins: [`chrome-extension://${EXTENSION_ID}/`],
};

for (const file of targets) {
  if (!existsSync(dirname(dirname(file))) && !file.includes('.chrome-profile')) continue; // browser not installed
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(manifest, null, 2));
  console.log(`Registered ${file}`);
}
console.log(`Using Claude CLI at ${claudePath}`);
