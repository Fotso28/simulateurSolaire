import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { map } from 'rxjs';
import { AdminAuthService } from './admin-auth.service';
import { AdminRole } from './models';

/**
 * Garde du back-office : exige une session (renouvelée si besoin après un
 * rechargement) et, si la route déclare `data.roles`, l'un de ces rôles.
 * Sans session → `/admin/login?returnUrl=…` ; rôle insuffisant → catalogue.
 */
export const adminAuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  return auth.ensureSession().pipe(
    map((ok) => {
      if (!ok) {
        return router.createUrlTree(['/admin/login'], {
          queryParams: { returnUrl: state.url },
        });
      }
      const roles = route.data['roles'] as AdminRole[] | undefined;
      if (!auth.hasRole(roles)) {
        return router.createUrlTree(['/admin/appareils']);
      }
      return true;
    }),
  );
};
