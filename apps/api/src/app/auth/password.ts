import * as argon2 from 'argon2';

/**
 * En test (Jest fixe NODE_ENV=test), coût argon2 minimal pour que les e2e
 * enchaînant plusieurs connexions restent rapides. `verify` lit les paramètres
 * stockés dans le hash : les deux réglages restent compatibles.
 */
const TEST_COST =
  process.env['NODE_ENV'] === 'test'
    ? { timeCost: 2, memoryCost: 1024, parallelism: 1 }
    : {};

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id, ...TEST_COST });
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/** Règle commune : 10 caractères minimum, avec lettre et chiffre. */
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{10,128}$/;
export const PASSWORD_MESSAGE =
  'Le mot de passe doit contenir au moins 10 caractères, dont une lettre et un chiffre.';
