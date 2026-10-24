/** Variables d'environnement des tests e2e (les valeurs déjà définies sont conservées). */
export const TEST_DATABASE_URL =
  process.env['DATABASE_URL_TEST'] ??
  'postgresql://simulateur:simulateur@localhost:5432/simulateur_test';

export function applyTestEnv(): void {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: TEST_DATABASE_URL,
    DATABASE_URL_UNPOOLED: TEST_DATABASE_URL,
    JWT_ACCESS_SECRET: 'test-secret-test-secret-test-secret-42',
    IP_HASH_SECRET: 'test-ip-hash-secret',
    CORS_ORIGINS: 'http://localhost:4200',
    STORAGE_DRIVER: 'local',
    LOCAL_MEDIA_DIR: 'tmp/media-test',
    PUBLIC_MEDIA_BASE_URL: 'http://localhost:3000/media',
    COOKIE_SECURE: 'false',
  });
}
