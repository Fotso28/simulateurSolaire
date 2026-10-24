import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { appRoutes } from './app.routes';
import { SimulationStore } from './core/simulation.store';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(appRoutes)],
    }).compileComponents();
  });

  it('affiche la localisation sur /', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Où sera installé votre système',
    );
  });

  it('mène le profil professionnel vers la saisie technique et le dimensionnement', async () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(SimulationStore).setMode('pro');
    await TestBed.inject(Router).navigateByUrl('/besoins');
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent,
    ).toContain('Saisie technique');
    await TestBed.inject(Router).navigateByUrl('/resultat');
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        'app-pro-result-page',
      ),
    ).not.toBeNull();
    TestBed.inject(SimulationStore).reset();
  });

  it('déclare les routes prévues par le TRD', () => {
    const paths = appRoutes.map((r) => r.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        '',
        'mode',
        'besoins',
        'autonomie',
        'resultat',
        'configurateur',
        'recapitulatif',
        's/:shareToken',
        'admin',
      ]),
    );
  });
});
