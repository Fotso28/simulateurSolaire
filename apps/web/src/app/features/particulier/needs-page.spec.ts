import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SimulationStore } from '../../core/simulation.store';
import { NeedsPage } from './needs-page';

function button(root: HTMLElement, label: string): HTMLButtonElement {
  const b = [...root.querySelectorAll('button')].find(
    (x) =>
      x.getAttribute('aria-label') === label ||
      x.textContent?.trim().startsWith(label),
  );
  if (!b) throw new Error(`bouton introuvable : ${label}`);
  return b;
}

describe('NeedsPage (mobile)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [NeedsPage],
      providers: [provideRouter([])],
    });
  });

  it('ajoute un appareil d’une catégorie et met à jour le récapitulatif', async () => {
    const fixture = TestBed.createComponent(NeedsPage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    expect(button(root, 'Ajoutez au moins un appareil').disabled).toBe(true);

    const header = button(root, 'Éclairage');
    expect(header.getAttribute('aria-expanded')).toBe('false');
    header.click();
    await fixture.whenStable();
    expect(header.getAttribute('aria-expanded')).toBe('true');

    button(root, 'Ajouter : Ampoule LED').click();
    await fixture.whenStable();
    button(root, 'Ajouter un appareil : Ampoule LED').click();
    await fixture.whenStable();

    const store = TestBed.inject(SimulationStore);
    expect(store.quantityOf('led-bulb')).toBe(2);
    expect(root.querySelector('.action-bar')?.textContent).toContain(
      '2\u00a0appareils',
    );
    // 2 × 10 W × 6 h = 120 Wh → 0,1 kWh ; fourchette 0,1 – 0,2
    expect(root.querySelector('.action-bar')?.textContent).toContain('0,1');
    expect(button(root, 'Continuer').disabled).toBe(false);
  });

  it('signale un appareil de plus de 1 500 W', async () => {
    const fixture = TestBed.createComponent(NeedsPage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    button(root, 'Électroménager').click();
    await fixture.whenStable();
    button(root, 'Ajouter : Bouilloire électrique').click();
    await fixture.whenStable();
    expect(root.textContent).toContain('pèse lourd');
  });

  it('ajoute un « Autre appareil » avec sa puissance (RF-06)', async () => {
    const fixture = TestBed.createComponent(NeedsPage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    button(root, 'Autre appareil').click();
    await fixture.whenStable();
    const form = root.querySelector('form') as HTMLFormElement;
    (form.querySelector('[name=label]') as HTMLInputElement).value =
      'Pompe à eau';
    (form.querySelector('[name=power]') as HTMLInputElement).value = '250';
    // Le navigateur bloque l'envoi d'un formulaire invalide : heures entières
    // (dont la valeur par défaut) et décimales doivent être acceptées.
    const hours = form.querySelector('[name=hours]') as HTMLInputElement;
    for (const v of ['4', '6', '24', '0.5', '2.3']) {
      hours.value = v;
      expect(form.checkValidity()).toBe(true);
    }
    hours.value = '4';
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    const load = TestBed.inject(SimulationStore).loads()[0];
    expect(load).toMatchObject({
      label: 'Pompe à eau',
      powerW: 250,
      quantity: 1,
    });
    expect(root.textContent).toContain('Pompe à eau');
  });

  it('règle la durée d’un « Autre appareil » déjà ajouté (RF-03)', async () => {
    const store = TestBed.inject(SimulationStore);
    store.addCustom({ label: 'Pompe à eau', powerW: 250, hoursPerDay: 4 });
    const fixture = TestBed.createComponent(NeedsPage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    button(root, 'Augmenter la durée : Pompe à eau').click();
    await fixture.whenStable();
    expect(store.loads()[0].hoursPerDay).toBe(5);
    expect(root.textContent).toContain('5\u00a0h');
  });
});
