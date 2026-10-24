import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { formatNumber as n } from '../ui/format';
import { PageHeader } from '../ui/page-header';
import { ResourceConfig, ResourceRow, ResourceTable } from './resource-table';

type Row = ResourceRow & Record<string, unknown>;
const num = (row: Row, key: string) => n(row[key] as number | null);
const text = (row: Row, key: string) => (row[key] as string | null) || '—';
const yesNo = (value: unknown) => (value ? 'Oui' : 'Non');

const PANELS: ResourceConfig<Row> = {
  path: 'equipment/panels',
  addLabel: 'Ajouter un panneau',
  editLabel: 'Modifier le panneau',
  rowLabel: (row) => text(row, 'label'),
  emptyText: 'Aucun panneau.',
  toggleActive: true,
  sort: (a, b) => (a['powerWp'] as number) - (b['powerWp'] as number),
  columns: [
    { label: 'Libellé', value: (r) => text(r, 'label') },
    { label: 'Pc (Wc)', value: (r) => num(r, 'powerWp'), numeric: true },
    { label: 'Voc (V)', value: (r) => num(r, 'vocV'), numeric: true },
    { label: 'Vmp (V)', value: (r) => num(r, 'vmpV'), numeric: true },
    { label: 'Isc (A)', value: (r) => num(r, 'iscA'), numeric: true },
    { label: 'Imp (A)', value: (r) => num(r, 'impA'), numeric: true },
    { label: 'Par défaut', value: (r) => yesNo(r['isDefault']) },
  ],
  fields: [
    {
      key: 'label',
      label: 'Libellé',
      type: 'text',
      required: true,
      maxLength: 120,
    },
    {
      key: 'powerWp',
      label: 'Puissance crête',
      unit: 'Wc',
      type: 'number',
      required: true,
      min: 1,
      max: 2000,
    },
    {
      key: 'vocV',
      label: 'Voc',
      unit: 'V',
      type: 'number',
      required: true,
      min: 1,
      max: 200,
    },
    {
      key: 'vmpV',
      label: 'Vmp',
      unit: 'V',
      type: 'number',
      required: true,
      min: 1,
      max: 200,
    },
    {
      key: 'iscA',
      label: 'Isc',
      unit: 'A',
      type: 'number',
      required: true,
      min: 0.1,
      max: 50,
    },
    {
      key: 'impA',
      label: 'Imp',
      unit: 'A',
      type: 'number',
      required: true,
      min: 0.1,
      max: 50,
    },
    { key: 'isDefault', label: 'Panneau proposé par défaut', type: 'checkbox' },
    { key: 'active', label: 'Actif', type: 'checkbox' },
  ],
};

const BATTERIES: ResourceConfig<Row> = {
  path: 'equipment/batteries',
  addLabel: 'Ajouter une batterie',
  editLabel: 'Modifier la batterie',
  rowLabel: (row) =>
    (row['label'] as string | null) ||
    `${row['technology'] === 'lithium' ? 'Lithium' : 'Plomb'} ${num(row, 'nominalVoltageV')} V ${num(row, 'capacityAh')} Ah`,
  emptyText: 'Aucune batterie.',
  toggleActive: true,
  sort: (a, b) =>
    String(a['technology']).localeCompare(String(b['technology'])) ||
    (a['nominalVoltageV'] as number) - (b['nominalVoltageV'] as number) ||
    (a['capacityAh'] as number) - (b['capacityAh'] as number),
  columns: [
    { label: 'Libellé', value: (r) => text(r, 'label') },
    {
      label: 'Technologie',
      value: (r) => (r['technology'] === 'lithium' ? 'Lithium' : 'Plomb / gel'),
    },
    {
      label: 'Tension (V)',
      value: (r) => num(r, 'nominalVoltageV'),
      numeric: true,
    },
    {
      label: 'Capacité (Ah)',
      value: (r) => num(r, 'capacityAh'),
      numeric: true,
    },
    { label: 'DoD', value: (r) => num(r, 'dod'), numeric: true },
  ],
  fields: [
    {
      key: 'label',
      label: 'Libellé',
      type: 'text',
      maxLength: 120,
      nullable: true,
    },
    {
      key: 'technology',
      label: 'Technologie',
      type: 'select',
      required: true,
      options: [
        { value: 'lithium', label: 'Lithium' },
        { value: 'plomb', label: 'Plomb / gel' },
      ],
    },
    {
      key: 'nominalVoltageV',
      label: 'Tension nominale',
      unit: 'V',
      type: 'number',
      required: true,
      min: 1,
      max: 60,
    },
    {
      key: 'capacityAh',
      label: 'Capacité',
      unit: 'Ah',
      type: 'number',
      required: true,
      min: 1,
      max: 5000,
    },
    {
      key: 'dod',
      label: 'Profondeur de décharge',
      type: 'number',
      required: true,
      min: 0.1,
      max: 1,
      help: 'Entre 0,1 et 1.',
    },
    { key: 'active', label: 'Active', type: 'checkbox' },
  ],
};

const INVERTERS: ResourceConfig<Row> = {
  path: 'equipment/inverters',
  addLabel: 'Ajouter un onduleur',
  editLabel: "Modifier l'onduleur",
  rowLabel: (row) =>
    (row['label'] as string | null) ||
    `${row['type'] === 'hybride' ? 'Hybride' : 'Autonome'} ${num(row, 'nominalPowerW')} W ${num(row, 'dcVoltageV')} V`,
  emptyText: 'Aucun onduleur.',
  toggleActive: true,
  sort: (a, b) =>
    String(a['type']).localeCompare(String(b['type'])) ||
    (a['nominalPowerW'] as number) - (b['nominalPowerW'] as number),
  columns: [
    { label: 'Libellé', value: (r) => text(r, 'label') },
    {
      label: 'Type',
      value: (r) => (r['type'] === 'hybride' ? 'Hybride' : 'Autonome'),
    },
    {
      label: 'P nom. (W)',
      value: (r) => num(r, 'nominalPowerW'),
      numeric: true,
    },
    { label: 'V DC', value: (r) => num(r, 'dcVoltageV'), numeric: true },
    { label: 'Surcharge', value: (r) => num(r, 'surgeFactor'), numeric: true },
    { label: 'Rendement', value: (r) => num(r, 'efficiency'), numeric: true },
    {
      label: 'MPPT (A · V)',
      value: (r) =>
        `${num(r, 'mpptMaxCurrentA')} · ${num(r, 'mpptMaxPvVoltageV')}`,
      numeric: true,
    },
  ],
  fields: [
    {
      key: 'label',
      label: 'Libellé',
      type: 'text',
      maxLength: 120,
      nullable: true,
    },
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      required: true,
      options: [
        { value: 'autonome', label: 'Autonome' },
        { value: 'hybride', label: 'Hybride (MPPT intégré)' },
      ],
    },
    {
      key: 'dcVoltageV',
      label: 'Tension DC',
      type: 'select',
      required: true,
      options: [12, 24, 48].map((v) => ({ value: v, label: `${v} V` })),
    },
    {
      key: 'nominalPowerW',
      label: 'Puissance nominale',
      unit: 'W',
      type: 'number',
      required: true,
      min: 50,
      max: 100000,
    },
    {
      key: 'surgeFactor',
      label: 'Facteur de surcharge',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
    },
    {
      key: 'efficiency',
      label: 'Rendement',
      type: 'number',
      required: true,
      min: 0.5,
      max: 1,
    },
    {
      key: 'mpptMaxCurrentA',
      label: 'MPPT I max',
      unit: 'A',
      type: 'number',
      min: 1,
      max: 500,
      nullable: true,
      help: 'Hybride seulement.',
    },
    {
      key: 'mpptMaxPvVoltageV',
      label: 'MPPT V PV max',
      unit: 'V',
      type: 'number',
      min: 1,
      max: 1500,
      nullable: true,
      help: 'Hybride seulement.',
    },
    { key: 'active', label: 'Actif', type: 'checkbox' },
  ],
};

const CONTROLLERS: ResourceConfig<Row> = {
  path: 'equipment/controllers',
  addLabel: 'Ajouter un régulateur',
  editLabel: 'Modifier le régulateur',
  rowLabel: (row) =>
    (row['label'] as string | null) ||
    `${String(row['type'])} ${num(row, 'maxCurrentA')} A ${num(row, 'maxPvVoltageV')} V`,
  emptyText: 'Aucun régulateur.',
  toggleActive: true,
  sort: (a, b) =>
    String(a['type']).localeCompare(String(b['type'])) ||
    (a['maxCurrentA'] as number) - (b['maxCurrentA'] as number),
  columns: [
    { label: 'Libellé', value: (r) => text(r, 'label') },
    { label: 'Type', value: (r) => String(r['type']) },
    { label: 'I max (A)', value: (r) => num(r, 'maxCurrentA'), numeric: true },
    {
      label: 'V PV max (V)',
      value: (r) => num(r, 'maxPvVoltageV'),
      numeric: true,
    },
    {
      label: 'I entrée max (A)',
      value: (r) => num(r, 'maxInputCurrentA'),
      numeric: true,
    },
    {
      label: 'Tensions',
      value: (r) =>
        ((r['supportedVoltages'] as number[]) ?? []).join(' / ') + ' V',
    },
  ],
  fields: [
    {
      key: 'label',
      label: 'Libellé',
      type: 'text',
      maxLength: 120,
      nullable: true,
    },
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      required: true,
      options: [
        { value: 'MPPT', label: 'MPPT' },
        { value: 'PWM', label: 'PWM' },
      ],
    },
    {
      key: 'maxCurrentA',
      label: 'Courant max',
      unit: 'A',
      type: 'number',
      required: true,
      min: 1,
      max: 500,
    },
    {
      key: 'maxPvVoltageV',
      label: 'Tension PV max',
      unit: 'V',
      type: 'number',
      required: true,
      min: 1,
      max: 1500,
    },
    {
      key: 'maxInputCurrentA',
      label: "Courant d'entrée max",
      unit: 'A',
      type: 'number',
      required: true,
      min: 0.1,
      max: 500,
    },
    {
      key: 'supportedVoltages',
      label: 'Tensions batterie supportées',
      type: 'voltages',
      required: true,
    },
    { key: 'active', label: 'Actif', type: 'checkbox' },
  ],
};

const CABLES: ResourceConfig<Row> = {
  path: 'equipment/cable-sections',
  addLabel: 'Ajouter une section',
  editLabel: 'Modifier la section',
  rowLabel: (row) => `${num(row, 'sectionMm2')} mm²`,
  emptyText: 'Aucune section de câble.',
  sort: (a, b) => (a['sectionMm2'] as number) - (b['sectionMm2'] as number),
  columns: [
    {
      label: 'Section (mm²)',
      value: (r) => num(r, 'sectionMm2'),
      numeric: true,
    },
    {
      label: 'Intensité admissible (A)',
      value: (r) => num(r, 'allowableCurrentA'),
      numeric: true,
    },
  ],
  fields: [
    {
      key: 'sectionMm2',
      label: 'Section',
      unit: 'mm²',
      type: 'number',
      required: true,
      min: 0.5,
      max: 500,
    },
    {
      key: 'allowableCurrentA',
      label: 'Intensité admissible',
      unit: 'A',
      type: 'number',
      required: true,
      min: 1,
      max: 2000,
    },
  ],
};

const PROTECTIONS: ResourceConfig<Row> = {
  path: 'equipment/protection-ratings',
  addLabel: 'Ajouter un calibre',
  editLabel: 'Modifier le calibre',
  rowLabel: (row) => `${String(row['type'])} ${num(row, 'ratingA')} A`,
  emptyText: 'Aucun calibre de protection.',
  sort: (a, b) =>
    String(a['type']).localeCompare(String(b['type'])) ||
    (a['ratingA'] as number) - (b['ratingA'] as number),
  columns: [
    { label: 'Type', value: (r) => String(r['type']) },
    { label: 'Calibre (A)', value: (r) => num(r, 'ratingA'), numeric: true },
  ],
  fields: [
    {
      key: 'type',
      label: 'Type',
      type: 'text',
      required: true,
      maxLength: 60,
      help: 'Identifiant stable, ex. battery_fuse, ac_breaker.',
    },
    {
      key: 'ratingA',
      label: 'Calibre',
      unit: 'A',
      type: 'number',
      required: true,
      min: 0.5,
      max: 2000,
    },
  ],
};

const TABS = [
  { id: 'panels', label: 'Panneaux', config: PANELS },
  { id: 'batteries', label: 'Batteries', config: BATTERIES },
  { id: 'inverters', label: 'Onduleurs', config: INVERTERS },
  { id: 'controllers', label: 'Régulateurs', config: CONTROLLERS },
  { id: 'cables', label: 'Sections de câbles', config: CABLES },
  { id: 'protections', label: 'Protections', config: PROTECTIONS },
] as const;

/** Matériel de référence utilisé par le moteur (RF-21). */
@Component({
  selector: 'app-equipment-page',
  imports: [PageHeader, ResourceTable],
  template: `
    <app-page-header
      title="Matériel de référence"
      subtitle="Le moteur choisit parmi le matériel actif ; un élément désactivé reste lisible dans les anciennes simulations."
    />
    <div
      role="tablist"
      aria-label="Type de matériel"
      class="flex flex-wrap gap-1 border-b border-line"
    >
      @for (tab of tabs; track tab.id; let i = $index) {
        <button
          type="button"
          role="tab"
          [id]="'tab-' + tab.id"
          [attr.aria-selected]="active() === i"
          [attr.aria-controls]="'panel-equipment'"
          [attr.tabindex]="active() === i ? 0 : -1"
          class="-mb-px min-h-11 border-b-2 px-3 text-small font-semibold"
          [class]="
            active() === i
              ? 'border-solar text-ink'
              : 'border-transparent text-muted hover:text-ink'
          "
          (click)="active.set(i)"
          (keydown.arrowRight)="move(1, $event)"
          (keydown.arrowLeft)="move(-1, $event)"
        >
          {{ tab.label }}
        </button>
      }
    </div>
    <div
      id="panel-equipment"
      role="tabpanel"
      [attr.aria-labelledby]="'tab-' + tabs[active()].id"
    >
      <app-resource-table [config]="config()" />
    </div>
  `,
  host: { class: 'flex flex-col gap-5' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentPage {
  protected readonly tabs = TABS;
  protected readonly active = signal(0);
  protected readonly config = computed(() => TABS[this.active()].config);

  protected move(delta: number, event: Event): void {
    const next = (this.active() + delta + TABS.length) % TABS.length;
    this.active.set(next);
    const target = event.target as HTMLElement;
    const sibling = target.parentElement?.children[next] as
      HTMLElement | undefined;
    sibling?.focus();
  }
}
