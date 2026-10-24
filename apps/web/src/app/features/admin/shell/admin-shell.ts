import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AdminAuthService } from '../core/admin-auth.service';
import { AdminRole } from '../core/models';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Icon, IconName } from '../ui/icon';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  roles?: AdminRole[];
}

/** Navigation du back-office ; les entrées réservées à l'ADMIN sont masquées pour l'EDITEUR. */
export const ADMIN_NAV: NavItem[] = [
  {
    path: 'statistiques',
    label: 'Statistiques',
    icon: 'stats',
    roles: ['ADMIN'],
  },
  { path: 'appareils', label: 'Appareils', icon: 'bulb' },
  { path: 'categories', label: 'Catégories', icon: 'grid' },
  { path: 'pays', label: 'Pays et régions', icon: 'pin', roles: ['ADMIN'] },
  {
    path: 'materiel',
    label: 'Matériel de référence',
    icon: 'battery',
    roles: ['ADMIN'],
  },
  {
    path: 'parametres',
    label: 'Paramètres de calcul',
    icon: 'sliders',
    roles: ['ADMIN'],
  },
  { path: 'comptes', label: 'Comptes', icon: 'users', roles: ['ADMIN'] },
  { path: 'journal', label: 'Journal', icon: 'clock', roles: ['ADMIN'] },
];

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, ConfirmDialog],
  template: `
    <div class="flex min-h-screen flex-wrap bg-bg text-ink">
      <nav
        aria-label="Back-office"
        class="flex max-w-none grow basis-[220px] flex-col gap-5 bg-ink px-3 py-5 text-white lg:max-w-[248px]"
      >
        <div class="flex items-center gap-2.5 px-2">
          <span
            class="flex size-8 items-center justify-center rounded-sm bg-solar text-ink"
          >
            <app-icon name="sun" [size]="20" [stroke]="1.75" />
          </span>
          <span class="flex flex-col">
            <span class="text-[15px] leading-5 font-semibold"
              >Simulateur solaire</span
            >
            <span
              class="font-mono text-[11px] leading-[14px] tracking-[0.04em] text-[#A7AAA2]"
              >BACK-OFFICE</span
            >
          </span>
        </div>
        <ul
          class="flex flex-wrap gap-0.5 text-small lg:flex-col lg:flex-nowrap"
        >
          @for (item of nav(); track item.path) {
            <li>
              <a
                [routerLink]="item.path"
                routerLinkActive="bg-[#2E3138] font-semibold !text-white"
                ariaCurrentWhenActive="page"
                class="flex min-h-11 items-center gap-2.5 rounded-sm px-2.5 text-[#D7D8D2] no-underline hover:bg-[#2E3138] focus-visible:outline-2 focus-visible:outline-solar"
              >
                <app-icon [name]="item.icon" />
                {{ item.label }}
              </a>
            </li>
          }
        </ul>
        <div
          class="mt-auto flex flex-col gap-2 border-t border-[#2E3138] px-2 pt-4 text-[13px]"
        >
          @if (auth.user(); as user) {
            <span class="truncate text-[#D7D8D2]" [title]="user.email">{{
              user.email
            }}</span>
            <span
              class="font-mono text-[11px] tracking-[0.04em] text-[#A7AAA2]"
            >
              {{ user.role === 'ADMIN' ? 'ADMINISTRATEUR' : 'ÉDITEUR' }}
            </span>
          }
          <button
            type="button"
            class="flex min-h-11 items-center gap-2.5 rounded-sm px-0.5 text-left text-[#D7D8D2] hover:text-white focus-visible:outline-2 focus-visible:outline-solar"
            (click)="logout()"
          >
            <app-icon name="logout" />
            Se déconnecter
          </button>
        </div>
      </nav>
      <main
        class="flex min-w-0 grow-[999] basis-[640px] flex-col gap-5 px-4 py-7 md:px-8"
      >
        <router-outlet />
      </main>
    </div>
    <app-confirm-dialog />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShell {
  protected readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  protected readonly nav = computed(() =>
    ADMIN_NAV.filter((item) => this.auth.hasRole(item.roles)),
  );

  protected logout(): void {
    this.auth.logout().subscribe({
      complete: () => void this.router.navigateByUrl('/admin/login'),
    });
  }
}
