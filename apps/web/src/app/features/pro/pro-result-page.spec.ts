import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
