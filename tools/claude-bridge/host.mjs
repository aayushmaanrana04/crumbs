#!/usr/bin/env node
// Dev-only native messaging host: lets the development build of the extension
// run prompts through the Claude Code CLI on this machine, on your own login.
// Never ship this. See tools/claude-bridge/README.md.
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLAUDE = process.env.CLAUDE_BIN || 'claude';
const TIMEOUT_MS = 180_000;
const MAX_REPLY_BYTES = 1024 * 1024; // Chrome's limit for host -> extension messages

// Native messaging framing: 4-byte little-endian length, then UTF-8 JSON.
function send(message) {
  let body = Buffer.from(JSON.stringify(message));
  if (body.length > MAX_REPLY_BYTES) {
    body = Buffer.from(JSON.stringify({ id: message.id, ok: false, error: 'Reply exceeded 1 MB.' }));
  }
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length);
  process.stdout.write(Buffer.concat([header, body]));
}

function run(args, input) {
  return new Promise((resolve, reject) => {
    mkdtemp(join(tmpdir(), 'summaryse-bridge-')).then((cwd) => {
      // An empty working directory keeps project CLAUDE.md files and settings out of the prompt.
      const child = spawn(CLAUDE, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => child.kill('SIGTERM'), TIMEOUT_MS);
      child.stdout.on('data', (d) => (stdout += d));
      child.stderr.on('data', (d) => (stderr += d));
      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error.code === 'ENOENT' ? new Error(`Claude CLI not found at "${CLAUDE}".`) : error);
      });
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        rm(cwd, { recursive: true, force: true });
        if (signal) return reject(new Error(`Claude CLI timed out after ${TIMEOUT_MS / 1000}s.`));
        if (code !== 0 && !stdout) return reject(new Error(stderr.trim() || `Claude CLI exited with code ${code}.`));
        resolve(stdout);
      });
      child.stdin.end(input ?? '');
    }, reject);
  });
}

async function complete({ prompt, system, schema, model }) {
  if (typeof prompt !== 'string' || !prompt) throw new Error('prompt is required.');
  const args = [
    '-p',
    '--output-format', 'json',
    '--model', model || 'haiku',
    // No tools: prompts contain text from web pages, which must not be able to act on this machine.
    '--tools', '',
    '--strict-mcp-config',
    '--setting-sources', '',
    '--no-session-persistence',
  ];
  if (system) args.push('--system-prompt', system);
  if (schema) args.push('--json-schema', JSON.stringify(schema));

  const out = JSON.parse(await run(args, prompt));
  if (out.is_error || out.subtype !== 'success') {
    throw new Error(out.result || `Claude CLI failed (${out.subtype ?? 'unknown error'}).`);
  }
  return {
    text: out.result ?? '',
    json: out.structured_output,
    model: Object.keys(out.modelUsage ?? {})[0] ?? model,
    durationMs: out.duration_ms,
  };
}

async function handle(request) {
  switch (request.type) {
    case 'version':
      return { version: (await run(['--version'])).trim() };
    case 'complete':
      return complete(request);
    default:
      throw new Error(`Unknown request type "${request.type}".`);
  }
}

let buffer = Buffer.alloc(0);
process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  while (buffer.length >= 4) {
    const length = buffer.readUInt32LE(0);
    if (buffer.length < 4 + length) break;
    const request = JSON.parse(buffer.subarray(4, 4 + length).toString('utf8'));
    buffer = buffer.subarray(4 + length);
    handle(request).then(
      (data) => send({ id: request.id, ok: true, data }),
      (error) => send({ id: request.id, ok: false, error: error.message }),
    );
  }
});
