import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { parseDecimal } from './format';

/** Nombre décimal (virgule acceptée) borné ; vide accepté (combiner avec `required`). */
export function decimalRange(
  min: number,
  max: number,
  integer = false,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined || String(raw).trim() === '')
      return null;
    const value = parseDecimal(raw);
    if (value === null) return { decimal: true };
    if (integer && !Number.isInteger(value)) return { integer: true };
    if (value < min || value > max) return { range: { min, max } };
    return null;
  };
}

/** Premier message d'erreur français d'un champ (affiché sous le champ). */
export function fieldError(control: AbstractControl | null): string | null {
  if (!control || !control.errors || !(control.touched || control.dirty))
    return null;
  const errors = control.errors;
  if (errors['server']) return String(errors['server']);
  if (errors['required']) return 'Champ obligatoire.';
  if (errors['email']) return 'Adresse e-mail invalide.';
  if (errors['decimal']) return 'Saisissez un nombre.';
  if (errors['integer']) return 'Saisissez un nombre entier.';
  if (errors['range']) {
    const { min, max } = errors['range'] as { min: number; max: number };
    return `Valeur attendue entre ${String(min).replace('.', ',')} et ${String(max).replace('.', ',')}.`;
  }
  if (errors['maxlength']) {
    return `${(errors['maxlength'] as { requiredLength: number }).requiredLength} caractères au maximum.`;
  }
  if (errors['minlength']) {
    return `${(errors['minlength'] as { requiredLength: number }).requiredLength} caractères au minimum.`;
  }
  if (errors['pattern']) return 'Format invalide.';
  if (errors['powerOrder']) return 'Il faut min ≤ typique ≤ max.';
  if (errors['numberList']) return 'Liste de nombres séparés par « ; ».';
  return 'Valeur invalide.';
}
