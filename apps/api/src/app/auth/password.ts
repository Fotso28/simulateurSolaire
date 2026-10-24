import * as argon2 from 'argon2';

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
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
