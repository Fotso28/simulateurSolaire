import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
import type { Device } from '@simulateur/shared-types';
import { Breakpoint } from '../../core/breakpoint';
import {
  CUSTOM_DEFAULT_POWER_W,
  LoadEntry,
  SimulationStore,
} from '../../core/simulation.store';
import {
  formatHours,
  formatNumber,
  kwh,
  NBSP,
  plural,
} from '../../core/format';
import { Icon } from '../../shared/icons/icon';
import { StepHeader } from '../../shared/layout/step-header';

interface CategoryView {
  id: string;
  name: string;
  iconKey: string;
  devices: Device[];
  count: number;
}

/**
 * Étape 3 (particulier) : appareils par catégorie (RF-02), heures
 * pré-remplies modifiables (RF-03), récapitulatif en direct (RF-04),
 * « Autre appareil » (RF-06). Mobile : catégories dépliables et récapitulatif
 * en bas ; desktop : catégories à gauche, grille, récapitulatif latéral.
 */
@Component({
  selector: 'app-needs-page',
  imports: [NgTemplateOutlet, Icon, StepHeader],
  templateUrl: './needs-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NeedsPage {
  protected readonly store = inject(SimulationStore);
  protected readonly isDesktop = inject(Breakpoint).isDesktop;
  private readonly router = inject(Router);

  /** Catégorie dépliée (mobile) ; `null` = toutes repliées. */
  protected readonly openCategory = signal<string | null>(null);
  /** Catégorie affichée (desktop) ; `other` = formulaire « Autre appareil ». */
  protected readonly activeCategory = signal<string>('');
  /** Ligne dont l'éditeur de durée est ouvert (mobile). */
  protected readonly editing = signal<string | null>(null);
  protected readonly customOpen = signal(false);

  protected readonly heavyThreshold = computed(
    () => this.store.params().values.heavyDeviceThresholdW ?? 1500,
  );

  protected readonly categories = computed<CategoryView[]>(() => {
    const { deviceCategories, devices } = this.store.catalog();
    const qty = this.store.quantities();
    return [...deviceCategories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => {
        const list = devices
          .filter((d) => d.categoryId === c.id && d.active)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        return {
          id: c.id,
          name: c.name,
          iconKey: c.iconKey ?? c.id,
          devices: list,
          count: list.reduce((n, d) => n + (qty.get(d.id) ?? 0), 0),
        };
      })
      .filter((c) => c.devices.length > 0);
  });

  protected readonly currentCategory = computed<CategoryView | undefined>(
    () => {
      const cats = this.categories();
      return cats.find((c) => c.id === this.activeCategory()) ?? cats[0];
    },
  );

  protected readonly customLoads = computed(() =>
    this.store.loads().filter((l) => !l.deviceId),
  );

  /** Énergie typique (Wh/j) par clé de ligne. */
  private readonly energyByKey = computed(() => {
    const active = this.store.activeLoads();
    const map = new Map<string, number>();
    for (const p of this.store.dailyEnergy().perLoad) {
      const load = active[p.index];
      if (load) map.set(load.key, p.typ);
    }
    return map;
  });

  /** Lignes du récapitulatif latéral (desktop). */
  protected readonly chosen = computed(() => {
    const devices = this.store.catalog().devices;
    return this.store.activeLoads().map((l) => {
      const device = devices.find((d) => d.id === l.deviceId);
      return {
        key: l.key,
        label: l.label,
        icon: device ? (device.iconKey ?? device.id) : 'other',
        quantity: l.quantity,
        energy: this.energyLabel(l.key),
      };
    });
  });

  protected readonly countLabel = computed(() =>
    plural(this.store.deviceCount(), 'appareil'),
  );
  protected readonly energy = computed(() => {
    const e = this.store.dailyEnergy();
    return { min: kwh(e.min), typ: kwh(e.typ), max: kwh(e.max) };
  });

  protected readonly formatHours = formatHours;

  protected rangeLabel(d: Device): string {
    const range =
      d.powerMinW === d.powerMaxW
        ? `${formatNumber(d.powerTypW)}${NBSP}W`
        : `${formatNumber(d.powerMinW)}–${formatNumber(d.powerMaxW)}${NBSP}W`;
    return this.store.quantityOf(d.id)
      ? range
      : `${range} · ${formatHours(d.defaultHoursPerDay)} / jour`;
  }

  protected energyLabel(key: string): string {
    return `${formatNumber(this.energyByKey().get(key) ?? 0)}${NBSP}Wh/j`;
  }

  protected isHeavy(d: Device): boolean {
    return (
      d.powerTypW > this.heavyThreshold() && this.store.quantityOf(d.id) > 0
    );
  }

  protected inc(d: Device): void {
    this.store.setQuantity(d, this.store.quantityOf(d.id) + 1);
  }

  protected dec(d: Device): void {
    const q = this.store.quantityOf(d.id) - 1;
    if (q <= 0 && this.editing() === d.id) this.editing.set(null);
    this.store.setQuantity(d, q);
  }

  protected toggleCategory(id: string): void {
    this.openCategory.update((cur) => (cur === id ? null : id));
  }

  protected toggleEdit(key: string): void {
    this.editing.update((cur) => (cur === key ? null : key));
  }

  protected openCustom(): void {
    this.customOpen.set(true);
    this.activeCategory.set('other');
  }

  protected addCustom(
    event: Event,
    label: HTMLInputElement,
    power: HTMLInputElement,
    hours: HTMLInputElement,
  ): void {
    event.preventDefault();
    if (!label.value.trim()) {
      label.focus();
      return;
    }
    const powerW = Number(power.value.replace(',', '.'));
    const hoursPerDay = Number(hours.value.replace(',', '.'));
    this.store.addCustom({
      label: label.value,
      powerW: Number.isFinite(powerW) && powerW > 0 ? powerW : undefined,
      hoursPerDay:
        Number.isFinite(hoursPerDay) && hoursPerDay > 0
          ? Math.min(24, hoursPerDay)
          : 4,
    });
    label.value = '';
    power.value = '';
    hours.value = '4';
    this.customOpen.set(false);
  }

  protected customSub(l: LoadEntry): string {
    const power = l.powerW
      ? `${formatNumber(l.powerW)}${NBSP}W`
      : `≈${NBSP}${formatNumber(CUSTOM_DEFAULT_POWER_W)}${NBSP}W (estimation)`;
    return `${power} · ${formatHours(l.hoursPerDay)} / jour`;
  }

  protected next(): void {
    this.store.flush();
    void this.router.navigateByUrl('/autonomie');
  }
}
