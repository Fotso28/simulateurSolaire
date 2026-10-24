import { corsOrigins, validateEnv } from './env';

const valid = {
  DATABASE_URL: 'postgresql://x',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  IP_HASH_SECRET: 'b'.repeat(16),
};

describe('validateEnv', () => {
  it('applique les valeurs par défaut', () => {
    const env = validateEnv(valid);
    expect(env.STORAGE_DRIVER).toBe('local');
    expect(env.COOKIE_SECURE).toBe(false);
    expect(
      corsOrigins(
        validateEnv({ ...valid, CORS_ORIGINS: 'https://a.fr, https://b.fr' }),
      ),
    ).toEqual(['https://a.fr', 'https://b.fr']);
  });

  it('cookie Secure par défaut en production, sauf mention contraire', () => {
    expect(
      validateEnv({ ...valid, NODE_ENV: 'production' }).COOKIE_SECURE,
    ).toBe(true);
    expect(
      validateEnv({ ...valid, NODE_ENV: 'production', COOKIE_SECURE: 'false' })
        .COOKIE_SECURE,
    ).toBe(false);
  });

  it('refuse une configuration incomplète', () => {
    expect(() => validateEnv({ ...valid, JWT_ACCESS_SECRET: 'court' })).toThrow(
      'JWT_ACCESS_SECRET',
    );
    expect(() =>
      validateEnv({ ...valid, STORAGE_DRIVER: 'vercel-blob' }),
    ).toThrow('BLOB_READ_WRITE_TOKEN');
  });
});
