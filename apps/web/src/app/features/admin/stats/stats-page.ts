import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AdminApiService } from '../core/admin-api.service';
import { Loader } from '../core/loader';
import { SimulationStats } from '../core/models';
import { formatNumber } from '../ui/format';
import { PageHeader, UI } from '../ui/page-header';
import { ListState } from '../ui/state';

const MODE_LABEL: Record<string, string> = {
  particulier: 'Particuliers',
  pro: 'Professionnels',
};

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Statistiques d'usage (RF-23) : simulations, régions, appareils les plus choisis. */
@Component({
  selector: 'app-stats-page',
  imports: [PageHeader, ListState],
  template: `
    <app-page-header
      title="Statistiques"
      subtitle="Simulations enregistrées sur la période choisie."
    >
      <form
        class="flex flex-wrap items-end gap-2 text-small text-ink-2"
        (submit)="$event.preventDefault(); loader.load()"
      >
        <label class="flex flex-col gap-1">
          Du
          <input
            type="date"
            [class]="ui.input + ' w-auto'"
            [value]="from()"
            (change)="from.set($any($event.target).value)"
          />
        </label>
        <label class="flex flex-col gap-1">
          Au
          <input
            type="date"
            [class]="ui.input + ' w-auto'"
            [value]="to()"
            (change)="to.set($any($event.target).value)"
          />
        </label>
        <button type="submit" [class]="ui.secondary">Afficher</button>
      </form>
    </app-page-header>

    <app-list-state
      [loading]="loader.loading()"
      [error]="loader.error()"
      (retry)="loader.load()"
    />

    @if (stats(); as s) {
      <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        <div class="rounded-xl border border-line bg-surface p-4">
          <p class="font-mono text-[11px] tracking-[0.04em] text-muted">
            SIMULATIONS
          </p>
          <p class="text-key">{{ fmt(s.total) }}</p>
        </div>
        @for (mode of modes(); track mode.key) {
          <div class="rounded-xl border border-line bg-surface p-4">
            <p
              class="font-mono text-[11px] tracking-[0.04em] text-muted uppercase"
            >
              {{ mode.label }}
            </p>
            <p class="text-key">{{ fmt(mode.count) }}</p>
          </div>
        }
      </div>

      <section class="flex flex-col gap-3" aria-labelledby="per-day-title">
        <h2 id="per-day-title" class="text-h2">Simulations par jour</h2>
        @if (s.perDay.length === 0) {
          <p class="text-small text-muted">Aucune simulation sur la période.</p>
        } @else {
          <div class="rounded-xl border border-line bg-surface p-4">
            <ul
              class="flex h-40 items-end gap-0.5"
              aria-label="Simulations par jour"
            >
              @for (day of s.perDay; track day.day) {
                <li
                  class="flex h-full min-w-1 flex-1 items-end"
                  [title]="day.day + ' : ' + day.count"
                >
                  <span
                    class="block w-full rounded-t-[2px] bg-ink-2"
                    [style.height.%]="(day.count / maxPerDay()) * 100"
                  ></span>
                  <span class="sr-only">{{ day.day }} : {{ day.count }}</span>
                </li>
              }
            </ul>
            <p
              class="mt-2 flex justify-between font-mono text-[11px] text-muted"
            >
              <span>{{ s.perDay[0].day }}</span>
              <span>max {{ maxPerDay() }} / jour</span>
              <span>{{ s.perDay[s.perDay.length - 1].day }}</span>
            </p>
          </div>
        }
      </section>

      <div class="flex flex-wrap gap-5">
        <section
          class="flex min-w-0 grow basis-[360px] flex-col gap-3"
          aria-labelledby="regions-title"
        >
          <h2 id="regions-title" class="text-h2">Régions</h2>
          <div [class]="ui.card">
            <table class="w-full border-collapse text-small">
              <thead>
                <tr>
                  <th scope="col" [class]="ui.th">Région</th>
                  <th scope="col" [class]="ui.th + ' text-right'">
                    Simulations
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (region of s.byRegion; track region.regionId) {
                  <tr class="bg-white">
                    <td [class]="ui.td">
                      {{ region.name }}
                      <span
                        class="mt-1 block h-1.5 rounded-sm bg-solar"
                        [style.width.%]="(region.count / maxRegion()) * 100"
                      ></span>
                    </td>
                    <td [class]="ui.td + ' text-right font-mono'">
                      {{ fmt(region.count) }}
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="2" class="px-4 py-6 text-center text-muted">
                      Aucune donnée.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
        <section
          class="flex min-w-0 grow basis-[360px] flex-col gap-3"
          aria-labelledby="devices-title"
        >
          <h2 id="devices-title" class="text-h2">Appareils les plus choisis</h2>
          <div [class]="ui.card">
            <table class="w-full border-collapse text-small">
              <thead>
                <tr>
                  <th scope="col" [class]="ui.th">Appareil</th>
                  <th scope="col" [class]="ui.th + ' text-right'">
                    Simulations
                  </th>
                  <th scope="col" [class]="ui.th + ' text-right'">Quantité</th>
                </tr>
              </thead>
              <tbody>
                @for (device of s.topDevices; track device.deviceId) {
                  <tr class="bg-white">
                    <td [class]="ui.td">{{ device.name }}</td>
                    <td [class]="ui.td + ' text-right font-mono'">
                      {{ fmt(device.count) }}
                    </td>
                    <td [class]="ui.td + ' text-right font-mono'">
                      {{ fmt(device.quantity) }}
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="3" class="px-4 py-6 text-center text-muted">
                      Aucune donnée.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsPage {
  private readonly api = inject(AdminApiService);
  protected readonly ui = UI;
  protected readonly fmt = formatNumber;

  protected readonly from = signal(
    isoDay(new Date(Date.now() - 29 * 86_400_000)),
  );
  protected readonly to = signal(isoDay(new Date()));
  protected readonly loader = new Loader(() =>
    this.api.list<SimulationStats>('stats/simulations', {
      from: this.from() ? `${this.from()}T00:00:00.000Z` : null,
      to: this.to() ? `${this.to()}T23:59:59.999Z` : null,
    }),
  );
  protected readonly stats = computed(() =>
    this.loader.loading() ? null : this.loader.data(),
  );
  protected readonly modes = computed(() =>
    Object.entries(this.stats()?.byMode ?? {}).map(([key, count]) => ({
      key,
      label: MODE_LABEL[key] ?? key,
      count,
    })),
  );
  protected readonly maxPerDay = computed(() =>
    Math.max(1, ...(this.stats()?.perDay ?? []).map((d) => d.count)),
  );
  protected readonly maxRegion = computed(() =>
    Math.max(1, ...(this.stats()?.byRegion ?? []).map((r) => r.count)),
  );

  constructor() {
    this.loader.load();
  }
}
