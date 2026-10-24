import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AdminApiService } from '../core/admin-api.service';
import { Loader } from '../core/loader';
import { CountryRow, RegionRow } from '../core/models';
import { formatDateTime, formatNumber } from '../ui/format';
import { PageHeader } from '../ui/page-header';
import { ResourceConfig, ResourceTable } from './resource-table';

const COUNTRIES: ResourceConfig<CountryRow> = {
  path: 'countries',
  addLabel: 'Ajouter un pays',
  editLabel: 'Modifier le pays',
  rowLabel: (row) => row.name,
  emptyText: 'Aucun pays.',
  sort: (a, b) =>
    a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'fr'),
  columns: [
    { label: 'Code', value: (row) => row.isoCode },
    { label: 'Nom', value: (row) => row.name },
    {
      label: 'Réseau (V)',
      value: (row) => formatNumber(row.gridVoltageV),
      numeric: true,
    },
    { label: 'Ordre', value: (row) => String(row.sortOrder), numeric: true },
  ],
  fields: [
    { key: 'name', label: 'Nom', type: 'text', required: true, maxLength: 80 },
    {
      key: 'isoCode',
      label: 'Code ISO',
      type: 'text',
      required: true,
      pattern: /^[A-Z]{2}$/,
      help: 'Deux lettres majuscules, ex. CM.',
    },
    {
      key: 'gridVoltageV',
      label: 'Tension réseau',
      unit: 'V',
      type: 'number',
      required: true,
      min: 100,
      max: 400,
      integer: true,
    },
    {
      key: 'sortOrder',
      label: 'Ordre',
      type: 'number',
      min: 0,
      max: 100000,
      integer: true,
    },
  ],
};

function regionsConfig(countries: CountryRow[]): ResourceConfig<RegionRow> {
  const countryName = new Map(countries.map((c) => [c.id, c.name]));
  return {
    path: 'regions',
    addLabel: 'Ajouter une région',
    editLabel: 'Modifier la région',
    rowLabel: (row) => row.name,
    emptyText: 'Aucune région pour ce pays.',
    sort: (a, b) => a.name.localeCompare(b.name, 'fr'),
    columns: [
      { label: 'Région', value: (row) => row.name },
      { label: 'Chef-lieu', value: (row) => row.capital },
      { label: 'Pays', value: (row) => countryName.get(row.countryId) ?? '—' },
      {
        label: 'Moy. (kWh/m²/j)',
        value: (row) => formatNumber(row.irradiationAvg),
        numeric: true,
      },
      {
        label: 'Mois défav.',
        value: (row) => formatNumber(row.irradiationMinMonth),
        numeric: true,
      },
      { label: 'Source', value: (row) => row.source },
      { label: 'Mise à jour', value: (row) => formatDateTime(row.updatedAt) },
    ],
    fields: [
      {
        key: 'countryId',
        label: 'Pays',
        type: 'select',
        required: true,
        options: countries.map((c) => ({ value: c.id, label: c.name })),
      },
      {
        key: 'name',
        label: 'Nom',
        type: 'text',
        required: true,
        maxLength: 80,
      },
      {
        key: 'capital',
        label: 'Chef-lieu',
        type: 'text',
        required: true,
        maxLength: 80,
      },
      {
        key: 'latitude',
        label: 'Latitude',
        unit: '°',
        type: 'number',
        required: true,
        min: -90,
        max: 90,
      },
      {
        key: 'longitude',
        label: 'Longitude',
        unit: '°',
        type: 'number',
        required: true,
        min: -180,
        max: 180,
      },
      {
        key: 'irradiationAvg',
        label: 'Ensoleillement moyen',
        unit: 'kWh/m²/j',
        type: 'number',
        required: true,
        min: 0.5,
        max: 10,
      },
      {
        key: 'irradiationMinMonth',
        label: 'Mois le plus défavorable',
        unit: 'kWh/m²/j',
        type: 'number',
        required: true,
        min: 0.5,
        max: 10,
      },
      {
        key: 'source',
        label: 'Source de la donnée',
        type: 'text',
        required: true,
        maxLength: 200,
        help: 'Ex. PVGIS 2024, NASA POWER.',
      },
    ],
  };
}

/** Pays et régions, avec l'ensoleillement utilisé par le moteur (RF-20). */
@Component({
  selector: 'app-geo-page',
  imports: [PageHeader, ResourceTable],
  template: `
    <app-page-header
      title="Pays et régions"
      subtitle="L'ensoleillement du mois le plus défavorable dimensionne le champ solaire."
    />
    <section class="flex flex-col gap-3" aria-labelledby="countries-title">
      <h2 id="countries-title" class="text-h2">Pays</h2>
      <app-resource-table [config]="countriesConfig" />
    </section>
    <section class="flex flex-col gap-3" aria-labelledby="regions-title">
      <h2 id="regions-title" class="text-h2">Régions</h2>
      @if (regions(); as config) {
        <app-resource-table
          [config]="config"
          [filter]="regionFilter()"
          [defaults]="regionDefaults()"
        >
          <label class="flex items-center gap-2 text-small text-ink-2">
            Pays
            <select
              class="h-11 rounded-md border border-line-strong bg-surface px-3 text-[15px] text-ink"
              [value]="countryId()"
              (change)="countryId.set($any($event.target).value)"
            >
              <option value="">Tous</option>
              @for (country of countries.data() ?? []; track country.id) {
                <option [value]="country.id">{{ country.name }}</option>
              }
            </select>
          </label>
        </app-resource-table>
      } @else if (countries.error()) {
        <p class="text-small text-crit-ink" role="alert">
          {{ countries.error() }}
        </p>
      } @else {
        <p class="text-small text-muted" role="status">Chargement…</p>
      }
    </section>
  `,
  host: { class: 'flex flex-col gap-5' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeoPage {
  private readonly api = inject(AdminApiService);
  protected readonly countriesConfig = COUNTRIES;
  protected readonly countries = new Loader(() =>
    this.api.list<CountryRow[]>('countries'),
  );
  protected readonly countryId = signal('');
  protected readonly regions = computed(() => {
    const countries = this.countries.data();
    return countries ? regionsConfig(countries) : null;
  });
  protected readonly regionFilter = computed(() => {
    const id = this.countryId();
    return id ? (row: RegionRow) => row.countryId === id : null;
  });
  protected readonly regionDefaults = computed(() => ({
    countryId: this.countryId(),
  }));

  constructor() {
    this.countries.load();
  }
}
