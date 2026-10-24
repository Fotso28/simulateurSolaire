import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { applyTestEnv } from './test-env';

/** Applique les migrations en attente sur la base de test (les tables sont vidées par chaque suite). */
export default function globalSetup(): void {
  applyTestEnv();
  execSync('npx prisma migrate deploy', {
    cwd: join(__dirname, '../../../..'),
    env: process.env,
    stdio: 'pipe',
  });
}
