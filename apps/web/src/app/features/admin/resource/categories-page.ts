import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DeviceCategoryRow } from '../core/models';
import { PageHeader } from '../ui/page-header';
import { ResourceConfig, ResourceTable } from './resource-table';

const CATEGORIES: ResourceConfig<DeviceCategoryRow> = {
  path: 'device-categories',
  addLabel: 'Ajouter une catégorie',
  editLabel: 'Modifier la catégorie',
  rowLabel: (row) => row.name,
  emptyText: 'Aucune catégorie.',
  deletable: true,
  sort: (a, b) =>
    a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'fr'),
  columns: [
    { label: 'Ordre', value: (row) => String(row.sortOrder), numeric: true },
    { label: 'Nom', value: (row) => row.name },
    {
      label: 'Appareils',
      value: (row) => String(row._count?.devices ?? '—'),
      numeric: true,
    },
    {
      label: 'Icône',
      value: (row) => (row.iconUrl ? 'SVG téléversé' : (row.iconKey ?? '—')),
    },
  ],
  fields: [
    { key: 'name', label: 'Nom', type: 'text', required: true, maxLength: 80 },
    {
      key: 'sortOrder',
      label: "Ordre d'affichage",
      type: 'number',
      min: 0,
      max: 100000,
      integer: true,
    },
    { key: 'iconUrl', label: 'Icône', type: 'icon' },
  ],
};

/** Catégories d'appareils : nom, icône, ordre d'affichage. */
@Component({
  selector: 'app-categories-page',
  imports: [PageHeader, ResourceTable],
  template: `
    <app-page-header
      title="Catégories"
      subtitle="Regroupent les appareils dans les listes du simulateur, dans l'ordre indiqué."
    />
    <app-resource-table [config]="config" />
  `,
  host: { class: 'flex flex-col gap-5' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPage {
  protected readonly config = CATEGORIES;
}
