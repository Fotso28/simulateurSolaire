import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { appRoutes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(appRoutes)],
    }).compileComponents();
  });

  it('affiche la page d’accueil sur /', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Dimensionnez votre installation solaire',
    );
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
        's/:shareToken',
        'admin',
      ]),
    );
  });
});
