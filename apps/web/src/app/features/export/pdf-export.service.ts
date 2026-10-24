import { Injectable, inject } from '@angular/core';
import { SimulationStore } from '../../core/simulation.store';
import type { TFontContainer } from 'pdfmake/interfaces';
import { buildPdfDocument, PdfData } from './pdf-document';

type PdfMake = typeof import('pdfmake/build/pdfmake');

/**
 * Export PDF côté navigateur (RF-17). pdfmake et la police Helvetica sont
 * chargés à la demande (hors bundle initial) ; le service worker les met en
 * cache, l'export marche donc hors-ligne.
 */
@Injectable({ providedIn: 'root' })
export class PdfExportService {
  private readonly store = inject(SimulationStore);

  /** Données du PDF pour la simulation courante, ou `null`. */
  data(shareUrl?: string): PdfData | null {
    this.store.flush();
    const input = this.store.input();
    const result = this.store.result();
    if (!input || !result) return null;
    return {
      input,
      result,
      catalog: this.store.catalog(),
      params: this.store.params(),
      region: this.store.region(),
      shareUrl,
      date: new Date(),
    };
  }

  async download(shareUrl?: string): Promise<void> {
    const data = this.data(shareUrl);
    if (!data) return;
    const [pdfMake, helvetica] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/standard-fonts/Helvetica'),
    ]);
    // Module UMD : selon l'outil, l'API est sur `default` ou à la racine.
    const lib =
      (pdfMake as unknown as { default?: PdfMake }).default ?? pdfMake;
    lib.addFontContainer(
      ((helvetica as { default?: unknown }).default ??
        helvetica) as TFontContainer,
    );
    lib.setUrlAccessPolicy(() => false);
    const day = data.date.toISOString().slice(0, 10);
    await lib
      .createPdf(buildPdfDocument(data))
      .download(`simulation-solaire-${day}.pdf`);
  }
}
