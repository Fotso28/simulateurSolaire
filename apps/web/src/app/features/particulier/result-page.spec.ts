import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Breakpoint } from '../../core/breakpoint';
import { SimulationStore } from '../../core/simulation.store';
import { enterDouala } from '../../core/test-helpers';
import { ConfiguratorPanel } from './configurator-panel';
import { RecapPage } from './recap-page';
import { ResultPage } from './result-page';

describe('écrans du résultat (cas de Douala)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    enterDouala(TestBed.inject(SimulationStore));
  });

  it('affiche la proposition en cartes, les variantes et la saison des pluies', async () => {
    const fixture = TestBed.createComponent(ResultPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('3\u00a0panneaux');
    expect(text).toContain('1\u202f000\u00a0W');
    expect(text).toContain('1\u00a0batterie 200\u00a0Ah');
    expect(text).toContain('Une nuit');
    expect(text).toContain('Un jour et demi');
    expect(text).toContain('Saison des pluies');
    const pressed = (fixture.nativeElement as HTMLElement).querySelector(
      'button[aria-pressed="true"]',
    );
    expect(pressed?.textContent).toContain('Une journée');
  });

  it('accorde « jour(s) » dans l’indicateur d’autonomie', async () => {
    TestBed.inject(SimulationStore).setAutonomy(3);
    const fixture = TestBed.createComponent(ResultPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toMatch(/Couvre \d+(,5)?\u00a0?\s?jours/);
    expect(text).not.toContain(',0 jour');
  });

  it('recalcule à chaque clic du configurateur', async () => {
    const fixture = TestBed.createComponent(ConfiguratorPanel);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    const up = root.querySelector(
      'button[aria-label="Onduleur plus puissant"]',
    ) as HTMLButtonElement;
    up.click();
    await fixture.whenStable();
    expect(root.textContent).toContain('Modifié');
    const reset = [...root.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Revenir à la proposition'),
    ) as HTMLButtonElement;
    expect(reset.disabled).toBe(false);
    const less = root.querySelector(
      'button[aria-label="Moins de stockage"]',
    ) as HTMLButtonElement;
    less.click();
    await fixture.whenStable();
    expect(root.textContent).toContain('2,4\u00a0kWh');
    expect(root.textContent).toContain('0,53');
    reset.click();
    await fixture.whenStable();
    expect(root.textContent).not.toContain('Modifié');
  });

  it('produit la nomenclature et le schéma de câblage', async () => {
    const fixture = TestBed.createComponent(RecapPage);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Panneau monocristallin 450 Wc');
    expect(root.textContent).toContain('Fusible batterie 63\u00a0A');
    expect(root.textContent).toContain('Mise à la terre');
    expect(
      root.querySelector('svg[role="img"]')?.getAttribute('aria-label'),
    ).toContain('Régulateur MPPT');
  });
});

describe('résultat desktop', () => {
  it('accorde le nombre d’appareils au singulier', async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Breakpoint, useValue: { isDesktop: signal(true) } },
      ],
    });
    const store = TestBed.inject(SimulationStore);
    enterDouala(store);
    const [first, ...rest] = store.loads();
    for (const l of rest) store.setLoadQuantity(l.key, 0);
    store.setLoadQuantity(first.key, 1);
    store.flush();
    const fixture = TestBed.createComponent(ResultPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('1\u00a0appareil ·');
  });
});
