import { InjectionToken } from '@angular/core';

/**
 * Points d'extension des actions du récapitulatif, fournis par le lot L5
 * (`providers` de `app.config.ts`) :
 * - `exportPdf` : PDF pdfmake (logo, région, hypothèses, nomenclature, schéma,
 *   avertissement) ; à défaut, impression du navigateur ;
 * - `share` : enregistre la simulation (`POST /simulations`) et renvoie l'URL
 *   `/s/:token` ; à défaut, partage de l'adresse de l'application ;
 * - `requestCallback` : demande de rappel pour un devis (RF-18) ; la carte
 *   « Besoin d'un devis ? » n'est affichée que si elle est fournie.
 */
export interface ResultActions {
  exportPdf?: () => Promise<void> | void;
  share?: () => Promise<string>;
  requestCallback?: () => Promise<void> | void;
}

export const RESULT_ACTIONS = new InjectionToken<ResultActions>(
  'RESULT_ACTIONS',
  { providedIn: 'root', factory: () => ({}) },
);

/**
 * Partage du résultat (récapitulatif, en-tête desktop du résultat) : partage
 * natif, sinon copie du lien. Renvoie le message à afficher ('' si aucun).
 */
export async function shareResult(actions: ResultActions): Promise<string> {
  try {
    const url = actions.share
      ? await actions.share()
      : (globalThis.location?.origin ?? '');
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: 'Ma simulation solaire', url });
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      return 'Lien copié.';
    }
    return '';
  } catch (error) {
    // Partage annulé par l'utilisateur : rien à signaler.
    if ((error as Error)?.name === 'AbortError') return '';
    return (error as Error)?.name === 'QueuedOfflineError'
      ? (error as Error).message
      : 'Le lien n’a pas pu être créé. Réessayez.';
  }
}
