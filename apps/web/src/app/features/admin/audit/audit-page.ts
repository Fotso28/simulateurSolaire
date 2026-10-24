import {
  ChangeDetectionStrategy,
  Component,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AdminApiService } from '../core/admin-api.service';
import { Loader } from '../core/loader';
import { AuditAction, AuditLogItem, Page } from '../core/models';
import { formatDateTime } from '../ui/format';
import { Icon } from '../ui/icon';
import { PageHeader, UI } from '../ui/page-header';
import { ListState } from '../ui/state';

const PAGE_SIZE = 25;

export const ENTITY_LABEL: Record<string, string> = {
  country: 'Pays',
  region: 'Région',
  device_category: "Catégorie d'appareils",
  device: 'Appareil',
  panel_model: 'Panneau',
  battery_model: 'Batterie',
  inverter_model: 'Onduleur',
  controller_model: 'Régulateur',
  cable_section: 'Section de câble',
  protection_rating: 'Protection',
  parameter_set: 'Jeu de paramètres',
  admin_user: 'Compte',
  media: 'Média',
};

export const ACTION_LABEL: Record<AuditAction, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  deactivate: 'Désactivation',
  activate: 'Activation',
  upload: 'Téléversement',
};

export interface DiffRow {
  key: string;
  before: string;
  after: string;
  changed: boolean;
}

function show(value: unknown): string {
  if (value === undefined) return '—';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/** Différences champ par champ entre l'état avant et l'état après. */
export function diffEntries(before: unknown, after: unknown): DiffRow[] {
  const a = (typeof before === 'object' && before) || {};
  const b = (typeof after === 'object' && after) || {};
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return keys.map((key) => {
    const x = show((a as Record<string, unknown>)[key]);
    const y = show((b as Record<string, unknown>)[key]);
    return { key, before: x, after: y, changed: x !== y };
  });
}

/** Journal d'audit : qui a modifié quoi et quand, avec l'avant / après. */
@Component({
  selector: 'app-audit-page',
  imports: [PageHeader, ListState, Icon],
  template: `
    <app-page-header
      title="Journal"
      subtitle="Toutes les écritures du back-office, avec l'état avant et après."
    />

    <div class="flex flex-wrap items-end gap-2.5 text-small text-ink-2">
      <label class="flex flex-col gap-1">
        Élément
        <select
          [class]="ui.input + ' w-auto'"
          [value]="entity()"
          (change)="setFilter(entity, $any($event.target).value)"
        >
          <option value="">Tous</option>
          @for (entry of entities; track entry[0]) {
            <option [value]="entry[0]">{{ entry[1] }}</option>
          }
        </select>
      </label>
      <label class="flex flex-col gap-1">
        Action
        <select
          [class]="ui.input + ' w-auto'"
          [value]="action()"
          (change)="setFilter(action, $any($event.target).value)"
        >
          <option value="">Toutes</option>
          @for (entry of actions; track entry[0]) {
            <option [value]="entry[0]">{{ entry[1] }}</option>
          }
        </select>
      </label>
      <label class="flex flex-col gap-1">
        Identifiant de l'élément
        <input
          [class]="ui.input + ' w-56'"
          [value]="entityId()"
          (change)="setFilter(entityId, $any($event.target).value.trim())"
        />
      </label>
    </div>

    <div [class]="ui.card">
      <table class="w-full min-w-[720px] border-collapse text-small">
        <thead>
          <tr>
            <th scope="col" [class]="ui.th">Date</th>
            <th scope="col" [class]="ui.th">Auteur</th>
            <th scope="col" [class]="ui.th">Action</th>
            <th scope="col" [class]="ui.th">Élément</th>
            <th scope="col" [class]="ui.th">
              <span class="sr-only">Détail</span>
            </th>
          </tr>
        </thead>
        <tbody>
          @for (item of items(); track item.id) {
            <tr class="bg-white">
              <td [class]="ui.td + ' whitespace-nowrap'">
                {{ date(item.createdAt) }}
              </td>
              <td [class]="ui.td">{{ item.adminUser?.email ?? '—' }}</td>
              <td [class]="ui.td">{{ actionLabel(item.action) }}</td>
              <td [class]="ui.td">
                {{ entityLabel(item.entity) }}
                @if (item.entityId) {
                  <span class="block font-mono text-[11px] text-muted">{{
                    item.entityId
                  }}</span>
                }
              </td>
              <td [class]="ui.td + ' text-right'">
                <button
                  type="button"
                  class="inline-flex min-h-11 items-center gap-1 rounded-sm px-2 font-semibold text-solar-ink"
                  [attr.aria-expanded]="openId() === item.id"
                  [attr.aria-controls]="'diff-' + item.id"
                  (click)="openId.set(openId() === item.id ? null : item.id)"
                >
                  Avant / après
                  <app-admin-icon
                    [name]="
                      openId() === item.id ? 'chevronLeft' : 'chevronRight'
                    "
                    [size]="16"
                  />
                </button>
              </td>
            </tr>
            @if (openId() === item.id) {
              <tr [id]="'diff-' + item.id">
                <td
                  colspan="5"
                  class="border-t border-[#ECECE6] bg-bg px-3.5 py-3"
                >
                  <table class="w-full border-collapse text-[13px]">
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          class="py-1 text-left font-mono text-[11px] text-ink-2"
                        >
                          CHAMP
                        </th>
                        <th
                          scope="col"
                          class="py-1 text-left font-mono text-[11px] text-ink-2"
                        >
                          AVANT
                        </th>
                        <th
                          scope="col"
                          class="py-1 text-left font-mono text-[11px] text-ink-2"
                        >
                          APRÈS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of diff(item); track row.key) {
                        <tr [class.bg-solar-soft]="row.changed">
                          <th
                            scope="row"
                            class="py-1 pr-3 text-left align-top font-mono font-normal"
                          >
                            {{ row.key }}
                            @if (row.changed) {
                              <span class="sr-only"> (modifié)</span>
                            }
                          </th>
                          <td
                            class="max-w-[320px] py-1 pr-3 align-top font-mono break-all"
                          >
                            {{ row.before }}
                          </td>
                          <td
                            class="max-w-[320px] py-1 align-top font-mono break-all"
                            [class.font-semibold]="row.changed"
                          >
                            {{ row.after }}
                          </td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="3" class="py-2 text-muted">
                            Pas de détail enregistré.
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
      <app-list-state
        [loading]="loader.loading()"
        [error]="loader.error()"
        [empty]="!loader.loading() && items().length === 0"
        emptyText="Aucune entrée pour ces filtres."
        (retry)="loader.load()"
      />
      @if (total() > 0) {
        <div
          class="flex items-center justify-between border-t border-[#ECECE6] px-3.5 py-2.5 text-[13px] text-muted"
        >
          <span aria-live="polite"
            >Page {{ page() }} sur {{ pageCount() }} ·
            {{ total() }} entrées</span
          >
          <span class="flex gap-2">
            <button
              type="button"
              class="inline-flex size-11 items-center justify-center rounded-sm border border-line-strong bg-white text-ink disabled:opacity-50"
              aria-label="Page précédente"
              [disabled]="page() <= 1"
              (click)="go(page() - 1)"
            >
              <app-admin-icon name="chevronLeft" [stroke]="1.75" />
            </button>
            <button
              type="button"
              class="inline-flex size-11 items-center justify-center rounded-sm border border-line-strong bg-white text-ink disabled:opacity-50"
              aria-label="Page suivante"
              [disabled]="page() >= pageCount()"
              (click)="go(page() + 1)"
            >
              <app-admin-icon name="chevronRight" [stroke]="1.75" />
            </button>
          </span>
        </div>
      }
    </div>
  `,
  host: { class: 'flex flex-col gap-5' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditPage {
  private readonly api = inject(AdminApiService);
  protected readonly ui = UI;
  protected readonly date = formatDateTime;
  protected readonly entities = Object.entries(ENTITY_LABEL);
  protected readonly actions = Object.entries(ACTION_LABEL);

  protected readonly entity = signal('');
  protected readonly action = signal('');
  protected readonly entityId = signal('');
  protected readonly page = signal(1);
  protected readonly openId = signal<string | null>(null);

  protected readonly loader = new Loader(() =>
    this.api.list<Page<AuditLogItem>>('audit-log', {
      entity: this.entity(),
      action: this.action(),
      entityId: this.entityId(),
      page: this.page(),
      pageSize: PAGE_SIZE,
    }),
  );
  protected readonly items = computed(() => this.loader.data()?.items ?? []);
  protected readonly total = computed(() => this.loader.data()?.total ?? 0);
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / PAGE_SIZE)),
  );

  constructor() {
    this.loader.load();
  }

  protected entityLabel(entity: string): string {
    return ENTITY_LABEL[entity] ?? entity;
  }

  protected actionLabel(action: AuditAction): string {
    return ACTION_LABEL[action] ?? action;
  }

  protected diff(item: AuditLogItem): DiffRow[] {
    return diffEntries(item.before, item.after);
  }

  protected setFilter(target: WritableSignal<string>, value: string): void {
    target.set(value);
    this.page.set(1);
    this.openId.set(null);
    this.loader.load();
  }

  protected go(page: number): void {
    this.page.set(page);
    this.openId.set(null);
    this.loader.load();
  }
}
