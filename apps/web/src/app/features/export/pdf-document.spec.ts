import { TestBed } from '@angular/core/testing';
import { SimulationStore } from '../../core/simulation.store';
import { enterDouala } from '../../core/test-helpers';
import { buildPdfDocument, pdfText } from './pdf-document';
import { PdfExportService } from './pdf-export.service';

describe('Export PDF', () => {
  beforeEach(() => sessionStorage.clear());

  it('remplace les caractères absents des polices standard', () => {
    expect(pdfText('≈ 3\u202F277 Wh → 24\u202FV − 1')).toBe(
      '~ 3 277 Wh -> 24 V - 1',
    );
  });

  it('contient région, hypothèses, nomenclature, schéma, saison des pluies', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(SimulationStore);
    enterDouala(store);
    const data = TestBed.inject(PdfExportService).data(
      'https://exemple.test/s/tok',
    );
    expect(data).not.toBeNull();
    if (!data) return;
    const doc = buildPdfDocument(data);
    const text = JSON.stringify(doc.content);
    for (const expected of [
      'Littoral',
      'HYPOTHÈSES',
      'LISTE DU MATÉRIEL',
      'ÉQUIPEMENTS',
      'PROTECTIONS',
      'SCHÉMA DE CÂBLAGE SIMPLIFIÉ',
      'Panneaux solaires',
      'Tableau électrique',
      'Saison des pluies',
      'https://exemple.test/s/tok',
      '<svg',
    ]) {
      expect(text).toContain(expected);
    }
    expect(text).not.toMatch(/[\u202F≈→]/);
    expect(doc.defaultStyle?.font).toBe('Helvetica');
  });

  it('ne produit rien sans simulation', () => {
    TestBed.configureTestingModule({});
    expect(TestBed.inject(PdfExportService).data()).toBeNull();
  });
});
