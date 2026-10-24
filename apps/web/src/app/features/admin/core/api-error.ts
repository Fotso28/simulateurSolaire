import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup } from '@angular/forms';
import { ApiErrorBody } from './models';

/** Préfixe commun des routes de l'API. */
export const API_BASE = '/api/v1';

/** Messages de repli quand l'API ne renvoie pas le format `{ code, message }`. */
const FALLBACK_BY_STATUS: Record<number, string> = {
  0: 'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.',
  401: 'Votre session a expiré. Reconnectez-vous.',
  403: "Vous n'avez pas les droits nécessaires pour cette action.",
  404: 'Élément introuvable.',
  413: 'Fichier trop volumineux (2 Mo au maximum).',
  423: 'Compte temporairement verrouillé.',
};

const GENERIC_ERROR = 'Une erreur inattendue est survenue. Réessayez.';

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiErrorBody).code === 'string' &&
    typeof (value as ApiErrorBody).message === 'string'
  );
}

/** Extrait `{ code, message, field }` de n'importe quelle erreur HTTP. */
export function toApiError(error: unknown): ApiErrorBody {
  if (error instanceof HttpErrorResponse) {
    if (isApiErrorBody(error.error)) return error.error;
    return {
      code: error.status === 0 ? 'NETWORK_ERROR' : `HTTP_${error.status}`,
      message: FALLBACK_BY_STATUS[error.status] ?? GENERIC_ERROR,
    };
  }
  if (isApiErrorBody(error)) return error;
  return { code: 'UNKNOWN', message: GENERIC_ERROR };
}

/** Message français affichable pour une erreur quelconque. */
export function errorMessage(error: unknown): string {
  return toApiError(error).message;
}

/**
 * Rattache une erreur de l'API au champ du formulaire qu'elle désigne
 * (`field` = chemin pointé, ex. `values.dodLithium`). Renvoie `true` si un
 * champ a été marqué, sinon l'appelant affiche le message globalement.
 */
export function applyServerError(form: FormGroup, error: unknown): boolean {
  const { field, message } = toApiError(error);
  if (!field) return false;
  const control: AbstractControl | null = form.get(field);
  if (!control) return false;
  control.setErrors({ ...(control.errors ?? {}), server: message });
  control.markAsTouched();
  return true;
}
