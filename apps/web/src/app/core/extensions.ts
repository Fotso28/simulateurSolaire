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
