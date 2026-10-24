import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminApiService } from '../core/admin-api.service';
import { errorMessage } from '../core/api-error';
import { ConfirmService } from '../core/confirm.service';
import { Loader } from '../core/loader';
import { DeviceCategoryRow, DeviceRow } from '../core/models';
import { formatNumber } from '../ui/format';
import { Icon } from '../ui/icon';
import { PageHeader, UI } from '../ui/page-header';
import { FormMessage, ListState, Switch } from '../ui/state';
import { DeviceForm } from './device-form';

const PAGE_SIZE = 12;

/** Catalogue d'appareils (RF-19) : liste filtrable, activation, panneau d'édition. */
@Component({
  selector: 'app-devices-page',
  imports: [PageHeader, Icon, Switch, ListState, FormMessage, DeviceForm],
  template: `
    <app-page-header title="Appareils" [subtitle]="subtitle()">
      <button type="button" [class]="ui.primary" (click)="openNew()">
        <app-icon name="plus" [stroke]="2" />
        Ajouter un appareil
      </button>
    </app-page-header>

    <app-form-message [message]="actionError()" />

    <div class="flex flex-wrap items-start gap-5">
      <section
        class="flex min-w-0 grow-[999] basis-[560px] flex-col gap-3"
        aria-label="Liste des appareils"
      >
        <div class="flex flex-wrap items-center gap-2.5">
          <label
            class="flex h-11 grow basis-60 items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-muted"
          >
            <app-icon name="search" />
            <span class="sr-only">Rechercher un appareil</span>
            <input
              type="search"
              class="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none"
              placeholder="Rechercher un appareil"
              [value]="search()"
              (input)="search.set($any($event.target).value); page.set(0)"
            />
          </label>
          <label class="flex items-center gap-2 text-small text-ink-2">
            Catégorie
            <select
              class="h-11 rounded-md border border-line-strong bg-surface px-3 text-[15px] text-ink"
              [value]="categoryId()"
              (change)="categoryId.set($any($event.target).value); page.set(0)"
            >
              <option value="">Toutes</option>
              @for (category of categories(); track category.id) {
                <option [value]="category.id">{{ category.name }}</option>
              }
            </select>
          </label>
          <label class="flex min-h-11 items-center gap-2 text-small text-ink-2">
            <input
              type="checkbox"
              class="size-[18px] accent-ink"
              [checked]="showInactive()"
              (change)="
                showInactive.set($any($event.target).checked); page.set(0)
              "
            />
            Afficher les désactivés
          </label>
        </div>

        <div [class]="ui.card">
          <table class="w-full min-w-[760px] border-collapse text-small">
            <thead>
              <tr>
                <th scope="col" [class]="ui.th">Appareil</th>
                <th scope="col" [class]="ui.th">Catégorie</th>
                <th scope="col" [class]="ui.th + ' text-right'">
                  P min · typ · max (W)
                </th>
                <th scope="col" [class]="ui.th + ' text-right'">
                  <abbr title="Heures par jour">H/J</abbr>
                </th>
                <th scope="col" [class]="ui.th + ' text-right'">
                  <abbr title="Taux de fonctionnement">Taux</abbr>
                </th>
                <th scope="col" [class]="ui.th + ' text-right'">
                  <abbr title="Facteur de démarrage">K</abbr>
                </th>
                <th scope="col" [class]="ui.th">Actif</th>
                <th scope="col" [class]="ui.th">
                  <span class="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              @for (device of pageItems(); track device.id) {
                <tr
                  [class]="
                    selectedId() === device.id
                      ? 'bg-solar-soft'
                      : device.active
                        ? 'bg-white'
                        : 'bg-[#FAFAF7] text-muted'
                  "
                >
                  <td [class]="ui.td">
                    <span class="flex items-center gap-2.5">
                      <span
                        class="flex size-9 shrink-0 items-center justify-center rounded-sm bg-bg"
                        [class.opacity-50]="!device.active"
                      >
                        @if (device.iconUrl) {
                          <img
                            [src]="device.iconUrl"
                            alt=""
                            class="size-[22px]"
                          />
                        } @else {
                          <app-icon
                            name="bulb"
                            [size]="20"
                            class="text-muted"
                          />
                        }
                      </span>
                      <span class="font-medium">{{ device.name }}</span>
                    </span>
                  </td>
                  <td [class]="ui.td">{{ categoryName(device.categoryId) }}</td>
                  <td
                    [class]="
                      ui.td +
                      ' text-right font-mono text-[13px] whitespace-nowrap'
                    "
                  >
                    {{ fmt(device.powerMinW) }} · {{ fmt(device.powerTypW) }} ·
                    {{ fmt(device.powerMaxW) }}
                  </td>
                  <td [class]="ui.td + ' text-right font-mono text-[13px]'">
                    {{ fmt(device.defaultHoursPerDay) }}
                  </td>
                  <td [class]="ui.td + ' text-right font-mono text-[13px]'">
                    {{ fmt(device.dutyCycle) }}
                  </td>
                  <td [class]="ui.td + ' text-right font-mono text-[13px]'">
                    {{ fmt(device.surgeFactor) }}
                  </td>
                  <td [class]="ui.td">
                    <app-switch
                      [checked]="device.active"
                      [label]="'Actif : ' + device.name"
                      [disabled]="togglingId() === device.id"
                      (switched)="toggleActive(device)"
                    />
                  </td>
                  <td [class]="ui.td">
                    <button
                      type="button"
                      [class]="ui.ghostIcon"
                      [attr.aria-label]="'Modifier : ' + device.name"
                      (click)="edit(device)"
                    >
                      <app-icon name="pencil" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <app-list-state
            [loading]="loader.loading()"
            [error]="loader.error()"
            [empty]="filtered().length === 0"
            emptyText="Aucun appareil ne correspond à ces critères."
            (retry)="loader.load()"
          />
          @if (filtered().length > 0) {
            <div
              class="flex items-center justify-between border-t border-[#ECECE6] px-3.5 py-2.5 text-[13px] leading-[18px] text-muted"
            >
              <span aria-live="polite">{{ rangeLabel() }}</span>
              <span class="flex gap-2">
                <button
                  type="button"
                  class="inline-flex size-11 items-center justify-center rounded-sm border border-line-strong bg-white text-ink disabled:border-line disabled:bg-[#F0F0EC] disabled:text-[#8a8d86]"
                  aria-label="Page précédente"
                  [disabled]="page() === 0"
                  (click)="page.set(page() - 1)"
                >
                  <app-icon name="chevronLeft" [stroke]="1.75" />
                </button>
                <button
                  type="button"
                  class="inline-flex size-11 items-center justify-center rounded-sm border border-line-strong bg-white text-ink disabled:border-line disabled:bg-[#F0F0EC] disabled:text-[#8a8d86]"
                  aria-label="Page suivante"
                  [disabled]="page() >= pageCount() - 1"
                  (click)="page.set(page() + 1)"
                >
                  <app-icon name="chevronRight" [stroke]="1.75" />
                </button>
              </span>
            </div>
          }
        </div>
      </section>

      @if (panelOpen()) {
        <app-device-form
          [device]="selected()"
          [categories]="categories()"
          [defaultCategoryId]="categoryId()"
          (saved)="onSaved($event)"
          (closed)="close()"
        />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevicesPage {
  private readonly api = inject(AdminApiService);
  private readonly confirm = inject(ConfirmService);
  protected readonly ui = UI;
  protected readonly fmt = formatNumber;

  protected readonly loader = new Loader(() =>
    forkJoin({
      categories: this.api.list<DeviceCategoryRow[]>('device-categories'),
      devices: this.api.list<DeviceRow[]>('devices', { includeInactive: true }),
    }),
  );
  /** Copie locale, mise à jour après chaque écriture ; réinitialisée à chaque chargement. */
  private readonly devices = linkedSignal(
    () => this.loader.data()?.devices ?? [],
  );
  protected readonly categories = computed(
    () => this.loader.data()?.categories ?? [],
  );

  protected readonly search = signal('');
  protected readonly categoryId = signal('');
  protected readonly showInactive = signal(false);
  protected readonly page = signal(0);
  protected readonly panelOpen = signal(false);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly togglingId = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected readonly selected = computed(
    () =>
      this.devices().find((device) => device.id === this.selectedId()) ?? null,
  );

  private readonly categoryOrder = computed(
    () =>
      new Map(this.categories().map((category, index) => [category.id, index])),
  );

  protected readonly filtered = computed(() => {
    const query = normalize(this.search());
    const categoryId = this.categoryId();
    const order = this.categoryOrder();
    return this.devices()
      .filter((device) => this.showInactive() || device.active)
      .filter((device) => !categoryId || device.categoryId === categoryId)
      .filter((device) => !query || normalize(device.name).includes(query))
      .sort(
        (a, b) =>
          (order.get(a.categoryId) ?? 0) - (order.get(b.categoryId) ?? 0) ||
          a.sortOrder - b.sortOrder ||
          a.name.localeCompare(b.name, 'fr'),
      );
  });

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)),
  );
  protected readonly pageItems = computed(() => {
    const start = Math.min(this.page(), this.pageCount() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });
  protected readonly rangeLabel = computed(() => {
    const total = this.filtered().length;
    const start = Math.min(this.page(), this.pageCount() - 1) * PAGE_SIZE;
    return `${start + 1}–${Math.min(start + PAGE_SIZE, total)} sur ${total}`;
  });
  protected readonly subtitle = computed(() => {
    const active = this.devices().filter((device) => device.active).length;
    return `${active} appareils actifs dans ${this.categories().length} catégories. Toute modification apparaît aussitôt dans le simulateur.`;
  });

  constructor() {
    this.loader.load();
  }

  protected categoryName(id: string): string {
    return (
      this.categories().find((category) => category.id === id)?.name ?? '—'
    );
  }

  protected openNew(): void {
    this.selectedId.set(null);
    this.panelOpen.set(true);
  }

  protected edit(device: DeviceRow): void {
    this.selectedId.set(device.id);
    this.panelOpen.set(true);
  }

  protected close(): void {
    this.panelOpen.set(false);
    this.selectedId.set(null);
  }

  protected onSaved(row: DeviceRow): void {
    this.upsert(row);
    this.selectedId.set(row.id);
  }

  protected async toggleActive(device: DeviceRow): Promise<void> {
    const activate = !device.active;
    const ok = await this.confirm.ask(
      activate
        ? {
            title: `Réactiver « ${device.name} » ?`,
            message:
              "L'appareil réapparaîtra aussitôt dans les listes du simulateur.",
            confirmLabel: 'Réactiver',
          }
        : {
            title: `Désactiver « ${device.name} » ?`,
            message:
              'Il disparaîtra des listes du simulateur mais restera lisible dans les anciennes simulations.',
            confirmLabel: 'Désactiver',
            danger: true,
          },
    );
    if (!ok) return;
    this.togglingId.set(device.id);
    this.actionError.set(null);
    const request = activate
      ? this.api.update<DeviceRow>(`devices/${device.id}`, { active: true })
      : this.api.remove<DeviceRow>(`devices/${device.id}`);
    request.subscribe({
      next: (row) => {
        this.togglingId.set(null);
        this.upsert(row);
      },
      error: (err: unknown) => {
        this.togglingId.set(null);
        this.actionError.set(errorMessage(err));
      },
    });
  }

  private upsert(row: DeviceRow): void {
    this.devices.update((list) =>
      list.some((device) => device.id === row.id)
        ? list.map((device) => (device.id === row.id ? row : device))
        : [...list, row],
    );
  }
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
