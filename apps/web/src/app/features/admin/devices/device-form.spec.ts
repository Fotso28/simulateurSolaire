import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminApiService } from '../core/admin-api.service';
import { AdminAuthService } from '../core/admin-auth.service';
import { DeviceCategoryRow, DeviceRow } from '../core/models';
import { DeviceForm } from './device-form';

const categories: DeviceCategoryRow[] = [
  { id: 'c1', name: 'Éclairage', iconKey: null, iconUrl: null, sortOrder: 0 },
  { id: 'c2', name: 'Froid', iconKey: null, iconUrl: null, sortOrder: 1 },
];

const fridge: DeviceRow = {
  id: 'd1',
  categoryId: 'c2',
  name: 'Réfrigérateur',
  iconKey: 'fridge',
  iconUrl: null,
  imageUrl: null,
  powerMinW: 80,
  powerTypW: 120,
  powerMaxW: 150,
  defaultHoursPerDay: 24,
  dutyCycle: 0.4,
  surgeFactor: 3,
  active: true,
  sortOrder: 2,
};

describe('DeviceForm', () => {
  let fixture: ComponentFixture<DeviceForm>;
  let http: HttpTestingController;
  let el: HTMLElement;

  function setup(device: DeviceRow | null) {
    TestBed.configureTestingModule({
      imports: [DeviceForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AdminApiService,
        { provide: AdminAuthService, useValue: { isAdmin: () => false } },
      ],
    });
    fixture = TestBed.createComponent(DeviceForm);
    fixture.componentRef.setInput('categories', categories);
    fixture.componentRef.setInput('device', device);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
  }

  const input = (label: string) =>
    [...el.querySelectorAll('label')]
      .find((l) => l.textContent?.trim().startsWith(label))
      ?.querySelector('input, select') as HTMLInputElement;

  function type(label: string, value: string) {
    const field = input(label);
    field.value = value;
    field.dispatchEvent(
      new Event(field.tagName === 'SELECT' ? 'change' : 'input'),
    );
  }

  async function submit() {
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  afterEach(() => http.verify());

  it('pré-remplit le formulaire avec l’appareil (virgule décimale)', () => {
    setup(fridge);
    expect(input('Nom').value).toBe('Réfrigérateur');
    expect(input('Taux').value).toBe('0,4');
    expect(input('TYPIQUE').value).toBe('120');
    expect(el.querySelector('h2')?.textContent).toContain('Réfrigérateur');
  });

  it('refuse min > max sans appeler l’API et l’annonce', async () => {
    setup(null);
    type('Nom', 'Ventilateur');
    type('Catégorie', 'c1');
    type('MIN', '100');
    type('MAX', '50');
    type('Heures / jour', '6');
    await submit();
    http.expectNone('/api/v1/admin/devices');
    expect(el.textContent).toContain('Il faut min ≤ typique ≤ max.');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Corrigez les champs signalés.',
    );
  });

  it('crée un appareil : typique vide = moyenne, nombres convertis', async () => {
    setup(null);
    const saved = jest.fn();
    fixture.componentInstance.saved.subscribe(saved);
    type('Nom', ' Ventilateur ');
    type('Catégorie', 'c1');
    type('MIN', '40');
    type('MAX', '75,5');
    type('Heures / jour', '6,5');
    type('Taux', '0,8');
    await submit();
    const req = http.expectOne('/api/v1/admin/devices');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Ventilateur',
      categoryId: 'c1',
      iconUrl: null,
      imageUrl: null,
      powerMinW: 40,
      powerTypW: 57.75,
      powerMaxW: 75.5,
      defaultHoursPerDay: 6.5,
      dutyCycle: 0.8,
      surgeFactor: 1,
      sortOrder: 0,
      active: true,
    });
    req.flush({ ...fridge, id: 'd9', name: 'Ventilateur' });
    fixture.detectChanges();
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ id: 'd9' }));
    expect(el.textContent).toContain('Appareil ajouté.');
  });

  it('modifie avec PATCH et rattache l’erreur de l’API au champ concerné', async () => {
    setup(fridge);
    type('Nom', 'Frigo');
    await submit();
    const req = http.expectOne('/api/v1/admin/devices/d1');
    expect(req.request.method).toBe('PATCH');
    req.flush(
      { code: 'ALREADY_EXISTS', message: 'Ce nom existe déjà.', field: 'name' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();
    expect(input('Nom').getAttribute('aria-invalid')).toBe('true');
    expect(el.textContent).toContain('Ce nom existe déjà.');
  });
});
