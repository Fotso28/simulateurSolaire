import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SimulationStore } from '../../core/simulation.store';
import { ProInputPage } from './pro-input-page';

function setup() {
  sessionStorage.clear();
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const store = TestBed.inject(SimulationStore);
  store.reset();
  store.setRegion('cm-littoral');
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

  it('saisie par appareils : ligne libre, catalogue, énergie et bandeau', () => {
    const { store, fixture, el, type, click } = setup();
    const submit = () =>
      [...el.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Dimensionner'),
      ) as HTMLButtonElement;
    expect(submit().disabled).toBe(true);
    expect(el.querySelector('#pro-blocker')?.textContent).toContain(
      'au moins une charge',
    );

    click('+ Ligne libre');
    const key = store.loads()[0].key;
    expect(el.querySelector('#pro-blocker')?.textContent).toContain(
      'puissance',
    );
    type(`#load-${key}-powerW`, '100');
    type(`#load-${key}-quantity`, '2');
    type(`#load-${key}-hoursPerDay`, '5');
    expect(store.loads()[0]).toMatchObject({
      powerW: 100,
      quantity: 2,
      hoursPerDay: 5,
    });
    expect(submit().disabled).toBe(false);
    expect(el.querySelector('[data-testid="pro-load"]')?.textContent).toContain(
      '1\u202f000',
    );

    click('Catalogue');
    const query = el.querySelector('#pro-catalog-q') as HTMLInputElement;
    type(query, 'frig');
    const fridge = store.catalog().devices.find((d) => d.id === 'fridge')!;
    const item = [...el.querySelectorAll('#pro-catalog button')].find((b) =>
      b.textContent?.includes(fridge.name),
    ) as HTMLButtonElement;
    item.click();
    store.flush();
    fixture.detectChanges();
    expect(store.loads()[1]).toMatchObject({
      deviceId: 'fridge',
      powerW: fridge.powerTypW,
    });
    expect(el.querySelector('#pro-catalog')).toBeNull();
    expect(store.result()).toBeDefined();
    expect(
      el.querySelector('[data-testid="pro-summary"]')?.textContent,
    ).toContain('P_dem');
  });

  it('valide les champs et bloque le dimensionnement', () => {
    const { store, el, type, click } = setup();
    click('+ Ligne libre');
    const key = store.loads()[0].key;
    type(`#load-${key}-powerW`, '60');
    type(`#load-${key}-quantity`, '1,5');
    const q = el.querySelector(`#load-${key}-quantity`) as HTMLInputElement;
    expect(q.getAttribute('aria-invalid')).toBe('true');
    expect(
      el.querySelector(`#load-${key}-quantity-err`)?.textContent,
    ).toContain('Quantité entière');
    expect(el.querySelector('#pro-blocker')?.textContent).toContain('Corrigez');
    expect(store.loads()[0].quantity).toBe(1);
    type(`#load-${key}-surgeFactor`, '0,5');
    expect(el.querySelector(`#load-${key}-surgeFactor-err`)).not.toBeNull();
    type(`#load-${key}-quantity`, '3');
    type(`#load-${key}-surgeFactor`, '');
    expect(el.querySelector('#pro-blocker')).toBeNull();
    expect(store.loads()[0].quantity).toBe(3);

    click('Puissance totale');
    type('#tot-p', 'abc');
    expect(el.querySelector('#pro-blocker')?.textContent).toContain('Corrigez');
  });
});
