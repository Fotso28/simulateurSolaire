import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Route } from '@angular/router';
import { AdminApiService } from './core/admin-api.service';
import { adminAuthGuard } from './core/admin-auth.guard';
import { adminAuthInterceptor } from './core/admin-auth.interceptor';
import { AdminAuthService } from './core/admin-auth.service';
import { ConfirmService } from './core/confirm.service';

const ADMIN_ONLY = { roles: ['ADMIN'] };

/**
 * Back-office, chargé à la demande. Les services et le client HTTP (avec
 * l'intercepteur d'authentification) sont fournis ici, au niveau de la route,
 * pour ne rien ajouter au bundle initial ni aux appels du parcours public.
 */
export const adminRoutes: Route[] = [
  {
    path: '',
    providers: [
      provideHttpClient(withInterceptors([adminAuthInterceptor])),
      AdminAuthService,
      AdminApiService,
      ConfirmService,
    ],
    children: [
      {
        path: 'login',
        title: 'Connexion — Back-office',
        loadComponent: () =>
          import('./login/login-page').then((m) => m.LoginPage),
      },
      {
        path: '',
        loadComponent: () =>
          import('./shell/admin-shell').then((m) => m.AdminShell),
        canActivate: [adminAuthGuard],
        canActivateChild: [adminAuthGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'appareils' },
          {
            path: 'statistiques',
            title: 'Statistiques — Back-office',
            data: ADMIN_ONLY,
            loadComponent: () =>
              import('./stats/stats-page').then((m) => m.StatsPage),
          },
          {
            path: 'appareils',
            title: 'Appareils — Back-office',
            loadComponent: () =>
              import('./devices/devices-page').then((m) => m.DevicesPage),
          },
          {
            path: 'categories',
            title: 'Catégories — Back-office',
            loadComponent: () =>
              import('./resource/categories-page').then(
                (m) => m.CategoriesPage,
              ),
          },
          {
            path: 'pays',
            title: 'Pays et régions — Back-office',
            data: ADMIN_ONLY,
            loadComponent: () =>
              import('./resource/geo-page').then((m) => m.GeoPage),
          },
          {
            path: 'materiel',
            title: 'Matériel de référence — Back-office',
            data: ADMIN_ONLY,
            loadComponent: () =>
              import('./resource/equipment-page').then((m) => m.EquipmentPage),
          },
          {
            path: 'parametres',
            title: 'Paramètres de calcul — Back-office',
            data: ADMIN_ONLY,
            loadComponent: () =>
              import('./parameters/parameters-page').then(
                (m) => m.ParametersPage,
              ),
          },
          {
            path: 'comptes',
            title: 'Comptes — Back-office',
            data: ADMIN_ONLY,
            loadComponent: () =>
              import('./users/users-page').then((m) => m.UsersPage),
          },
          {
            path: 'journal',
            title: 'Journal — Back-office',
            data: ADMIN_ONLY,
            loadComponent: () =>
              import('./audit/audit-page').then((m) => m.AuditPage),
          },
        ],
      },
    ],
  },
];
