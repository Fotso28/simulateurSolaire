import { inject } from '@angular/core';
import { Route } from '@angular/router';
import { SimulationStore } from './core/simulation.store';

const placeholder = () =>
  import('./shared/placeholder-page').then((m) => m.PlaceholderPage);

/** Vrai quand l'utilisateur a choisi le profil professionnel sur `/mode`. */
export const isProMode = () => inject(SimulationStore).mode() === 'pro';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Où sera installé votre système ? · Simulateur solaire',
    loadComponent: () =>
      import('./features/particulier/location-page').then(
        (m) => m.LocationPage,
      ),
  },
  {
    path: 'mode',
    title: 'Particulier ou professionnel · Simulateur solaire',
    loadComponent: () =>
      import('./features/particulier/mode-page').then((m) => m.ModePage),
  },
  {
    // Point d'extension L4 : saisie professionnelle (tableau ou totaux).
    // Remplacer `placeholder` par `features/pro/…` ; le garde reste le même.
    path: 'besoins',
    canMatch: [isProMode],
    title: 'Saisie professionnelle · Simulateur solaire',
    loadComponent: placeholder,
  },
  {
    path: 'besoins',
    title: 'Vos appareils · Simulateur solaire',
    loadComponent: () =>
      import('./features/particulier/needs-page').then((m) => m.NeedsPage),
  },
  {
    path: 'autonomie',
    title: 'Autonomie · Simulateur solaire',
    loadComponent: () =>
      import('./features/particulier/autonomy-page').then(
        (m) => m.AutonomyPage,
      ),
  },
  {
    path: 'resultat',
    title: 'Votre installation · Simulateur solaire',
    loadComponent: () =>
      import('./features/particulier/result-page').then((m) => m.ResultPage),
  },
  {
    path: 'configurateur',
    title: 'Ajuster l’installation · Simulateur solaire',
    loadComponent: () =>
      import('./features/particulier/configurator-page').then(
        (m) => m.ConfiguratorPage,
      ),
  },
  {
    path: 'recapitulatif',
    title: 'Liste du matériel · Simulateur solaire',
    loadComponent: () =>
      import('./features/particulier/recap-page').then((m) => m.RecapPage),
  },
  {
    // Point d'extension L5 : simulation partagée en lecture.
    path: 's/:shareToken',
    title: 'Simulation partagée',
    loadComponent: placeholder,
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },
  { path: '**', redirectTo: '' },
];
