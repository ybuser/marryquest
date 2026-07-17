import { randomBytes } from 'node:crypto';

if (process.argv.length > 2) {
  process.stderr.write('SECRET_GENERATION_FAILED\n');
  process.exitCode = 1;
} else {
  process.stdout.write(`${randomBytes(32).toString('base64url')}\n`);
}
