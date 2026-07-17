import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createPasswordHash } = require('../lib/security/passwordHash.js');

const MAXIMUM_STDIN_BYTES = 4096;

async function main() {
  if (process.argv.length > 2) {
    throw new Error('Command-line password arguments are not supported.');
  }

  const chunks = [];
  let totalBytes = 0;
  let inputBuffer;
  let password = '';

  try {
    for await (const chunk of process.stdin) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;
      if (totalBytes > MAXIMUM_STDIN_BYTES) {
        buffer.fill(0);
        throw new Error('Standard input is too large.');
      }
      chunks.push(buffer);
    }

    inputBuffer = Buffer.concat(chunks);
    password = new TextDecoder('utf-8', { fatal: true }).decode(inputBuffer);
    if (password.endsWith('\r\n')) {
      password = password.slice(0, -2);
    } else if (password.endsWith('\n')) {
      password = password.slice(0, -1);
    }

    const encodedHash = await createPasswordHash(password);
    process.stdout.write(`${encodedHash}\n`);
  } finally {
    inputBuffer?.fill(0);
    for (const chunk of chunks) {
      chunk.fill(0);
    }
    password = '';
  }
}

main().catch(() => {
  process.stderr.write('OWNER_PASSWORD_HASH_GENERATION_FAILED\n');
  process.exitCode = 1;
});
