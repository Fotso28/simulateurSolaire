import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RESULT_ACTIONS } from '../../core/extensions';
import { QueuedOfflineError } from '../../core/share.service';
import { SimulationStore } from '../../core/simulation.store';
import { enterDouala } from '../../core/test-helpers';
import { RecapPage } from '../particulier/recap-page';
import { ProResultPage } from './pro-result-page';

function render() {
  const fixture = TestBed.createComponent(ProResultPage);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ProResultPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('sans charge : invite à revenir à la saisie', () => {
    const store = TestBed.inject(SimulationStore);
    store.reset();
    store.setMode('pro');
    const el = render();
    expect(el.textContent).toContain('Aucune charge saisie');
    expect(el.querySelector('a[href="/besoins"]')).not.toBeNull();
  });

  it('affiche les fiches techniques, câbles, protections et liens', () => {
    const store = TestBed.inject(SimulationStore);
    enterDouala(store);
    store.setMode('pro');
    const el = render();
    const text = el.textContent ?? '';
    for (const key of ['pv', 'controller', 'battery', 'inverter']) {
      expect(el.querySelector(`[data-testid="card-${key}"]`)).not.toBeNull();
    }
    expect(text).toContain('Câbles');
    expect(text).toContain('Panneaux → régulateur');
    expect(text).toContain('mm²');
    expect(text).toContain('Protections');
    expect(text).toContain('P_PV requise');
    expect(el.querySelector('a[href="/recapitulatif"]')).not.toBeNull();
  });

  it('saison des pluies affichée une seule fois, seuil onduleur avec la pointe', () => {
    const store = TestBed.inject(SimulationStore);
    store.reset();
    store.setRegion('cm-littoral');
    store.setMode('pro');
    store.setTotals({ powerW: 400, dailyEnergyWh: 2000, surgeFactor: 3.5 });
    store.overrides.set({ inverterId: 'inv-sa-12v-600' });
    const el = render();
    const text = el.textContent ?? '';
    expect(text.split('Saison des pluies').length - 1).toBe(1);
    // max(1,25 × 400 ; 1 400 / 2) = 700 W
    expect(text).toContain('≥ 700\u00a0W');
    expect(text).toContain('INVERTER_UNDERSIZED');
  });

  it('puissance totale : dimensionne sans liste d’appareils', () => {
    const store = TestBed.inject(SimulationStore);
    store.reset();
    store.setRegion('cm-littoral');
    store.setMode('pro');
    store.setTotals({ powerW: 435, dailyEnergyWh: 3277, surgeFactor: 1.8 });
    const el = render();
    expect(store.outcome().status).toBe('ok');
    expect(el.querySelector('[data-testid="card-pv"]')).not.toBeNull();
  });

  it('récapitulatif : vocabulaire technique en pro, inchangé en particulier', () => {
    const store = TestBed.inject(SimulationStore);
    enterDouala(store);
    const recap = () => {
      const f = TestBed.createComponent(RecapPage);
      f.detectChanges();
      return (f.nativeElement as HTMLElement).textContent ?? '';
    };
    expect(recap()).toContain('Consommation');
    store.setMode('pro');
    const text = recap();
    expect(text).not.toContain('Consommation');
    expect(text).toContain('Wh/j');
    expect(text).toContain('P_inst / P_dem');
    expect(text).toContain('Calibre');
  });
});

describe('ProResultPage — partage', () => {
  it('signale un partage mis en attente hors ligne', async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: RESULT_ACTIONS,
          useValue: { share: () => Promise.reject(new QueuedOfflineError()) },
        },
      ],
    });
    const store = TestBed.inject(SimulationStore);
    enterDouala(store);
    store.setMode('pro');
    const fixture = TestBed.createComponent(ProResultPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const btn = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Partager'),
    );
    btn?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('Vous êtes hors ligne');
  });
});
