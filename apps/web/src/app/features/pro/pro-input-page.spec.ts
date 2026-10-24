import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SimulationStore } from '../../core/simulation.store';
import { ProInputPage } from './pro-input-page';

function setup() {
  sessionStorage.clear();
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const store = TestBed.inject(SimulationStore);
  store.reset();
  store.setMode('pro');
  const fixture = TestBed.createComponent(ProInputPage);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const type = (selector: string | HTMLInputElement, value: string) => {
    const input =
      typeof selector === 'string'
        ? (el.querySelector(selector) as HTMLInputElement)
        : selector;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const click = (label: string) => {
    const button = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.trim().startsWith(label),
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
  };
  return { store, fixture, el, type, click };
}

describe('ProInputPage', () => {
  it('saisie en puissance totale → totaux du store', () => {
    const { store, el, type, click } = setup();
    click('Puissance totale');
    type('#tot-p', '435');
    (el.querySelector('#tot-p') as HTMLInputElement).dispatchEvent(
      new Event('blur'),
    );
    type('#tot-e', '3 277');
    type('#tot-k', '1,8');
    expect(store.totals()).toEqual({
      powerW: 435,
      dailyEnergyWh: 3277,
      surgeFactor: 1.8,
    });
    click('Par appareil');
    expect(store.totals()).toBeUndefined();
  });
});
