import { Route } from '@angular/router';

/** Back-office, chargé à la demande. Garde de route et écrans : lot L4. */
export const adminRoutes: Route[] = [
  {
    path: '',
    title: 'Back-office',
    loadComponent: () =>
      import('../../shared/placeholder-page').then((m) => m.PlaceholderPage),
  },
];
