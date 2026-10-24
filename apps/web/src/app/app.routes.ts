import { Route } from '@angular/router';

const placeholder = () =>
  import('./shared/placeholder-page').then((m) => m.PlaceholderPage);

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Simulateur solaire',
    loadComponent: () =>
      import('./features/home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'mode',
    title: 'Particulier ou professionnel',
    loadComponent: placeholder,
  },
  { path: 'besoins', title: 'Vos besoins', loadComponent: placeholder },
  { path: 'autonomie', title: 'Autonomie', loadComponent: placeholder },
  { path: 'resultat', title: 'Notre proposition', loadComponent: placeholder },
  { path: 'configurateur', title: 'Configurateur', loadComponent: placeholder },
  {
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
