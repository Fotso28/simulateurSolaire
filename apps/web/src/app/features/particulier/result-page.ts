import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { SimulationResult } from '@simulateur/shared-types';
import { Breakpoint } from '../../core/breakpoint';
import { SimulationStore } from '../../core/simulation.store';
import {
  autonomyLabel,
  formatDays,
  formatKwh,
  formatNumber,
  formatPercent,
  formatW,
  kwh,
  NBSP,
} from '../../core/format';
import { Icon } from '../../shared/icons/icon';
import { StepHeader } from '../../shared/layout/step-header';
import { AlertList, RainNotice } from '../../shared/ui/notices';
import { ConfiguratorPanel } from './configurator-panel';
import {
  batteryUnits,
  controllerModel,
  equipmentCards,
  panelModel,
  variantDelta,
} from './result-view';

/**
 * Étape 5 : fourchette (RF-05), proposition médiane en cartes, variantes
 * d'autonomie (RF-12), alertes (RF-14), saison des pluies (RF-16).
 * Desktop : résultat et configurateur côte à côte.
 */
@Component({
  selector: 'app-result-page',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    Icon,
    StepHeader,
    AlertList,
    RainNotice,
    ConfiguratorPanel,
  ],
  templateUrl: './result-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultPage {
  protected readonly store = inject(SimulationStore);
  protected readonly isDesktop = inject(Breakpoint).isDesktop;

  protected readonly batteryLabel = computed(() =>
    this.store.batteryTech() === 'lithium' ? 'Lithium' : 'Plomb ou gel',
  );

  /** Fourchette de consommation : positions en % sur une échelle arrondie. */
  protected readonly range = computed(() => {
    const r = this.store.result();
    if (!r) return null;
    const { min, typ, max } = r.energyWhPerDay;
    const scaleKwh = Math.max(1, Math.floor(max / 1000) + 1);
    const pct = (wh: number) => Math.round((wh / 1000 / scaleKwh) * 1000) / 10;
    return {
      typ: kwh(typ),
      min: kwh(min),
      max: kwh(max),
      scale: `${scaleKwh}${NBSP}kWh`,
      minPct: pct(min),
      typPct: pct(typ),
      maxPct: pct(max),
      widthPct: pct(max) - pct(min),
      aria: `Fourchette de ${kwh(min)} à ${kwh(max)} kWh par jour, valeur typique ${kwh(typ)}`,
      isRange: max - min > 1,
    };
  });

  protected readonly cards = computed(() => {
    const r = this.store.result();
    if (!r) return [];
    return equipmentCards(r, {
      catalog: this.store.catalog(),
      params: this.store.params(),
      region: this.store.region(),
      autonomyDays: this.store.autonomyDays(),
    });
  });

  protected readonly indicators = computed(() => {
    const r = this.store.result();
    if (!r) return null;
    const minDays = this.store.params().values.minAutonomyDays ?? 0.5;
    const days = r.effectiveAutonomyDays;
    const aOk = days >= minDays - 1e-9;
    const covers =
      days >= 1.5
        ? `${formatNumber(Math.floor(days * 2) / 2, 1)} jour`
        : days >= 1
          ? 'une journée'
          : 'une nuit';
    return {
      autonomy: formatDays(days),
      autonomyOk: aOk,
      autonomyState: aOk ? `Couvre ${covers}` : 'Moins d’une nuit',
      coverage: formatPercent(r.pvCoverage),
      coverageOk: r.pvCoverage >= 1 - 1e-9,
    };
  });

  /** Trois colonnes : palier inférieur, choix actuel, palier supérieur. */
  protected readonly variants = computed(() => {
    const r = this.store.result();
    if (!r) return [];
    const catalog = this.store.catalog();
    const steps = this.store.params().values.autonomySteps;
    const current = this.store.autonomyDays();
    const i = steps.indexOf(current);
    const lowerDays = i > 0 ? steps[i - 1] : undefined;
    const upperDays = i >= 0 && i < steps.length - 1 ? steps[i + 1] : undefined;
    const panel = panelModel(catalog, r);
    const controller = controllerModel(catalog, r);
    const shared = {
      panels: `${r.pv.count} × ${panel ? `${formatNumber(panel.powerWp)}${NBSP}Wc` : ''}`,
      inverter: formatW(r.inverter.nominalW),
      controller: controller
        ? `${controller.type} ${formatNumber(controller.maxCurrentA)}${NBSP}A`
        : 'Intégré',
    };
    const mk = (days: number, v: Partial<SimulationResult>, on: boolean) => ({
      days,
      on,
      label: autonomyLabel(days),
      kwh: kwh(v.battery?.capacityWh ?? 0),
      units: batteryUnits(catalog, v),
      aeff: formatDays(v.effectiveAutonomyDays ?? 0),
      delta: on ? 'Votre choix' : variantDelta(v, r),
      ...shared,
    });
    const list = [];
    if (lowerDays !== undefined && r.variants.lower?.battery)
      list.push(mk(lowerDays, r.variants.lower, false));
    list.push(mk(current, r, true));
    if (upperDays !== undefined && r.variants.upper?.battery)
      list.push(mk(upperDays, r.variants.upper, false));
    return list;
  });

  /** « Comparer sans » les appareils lourds (> 1 500 W). */
  protected readonly heavy = computed(() => {
    const r = this.store.result();
    const input = this.store.baseInput();
    if (!r || !input?.loads) return [];
    return r.alerts
      .filter((a) => a.code === 'HEAVY_DEVICE' && a.loadIndex !== undefined)
      .map((a) => {
        const index = a.loadIndex as number;
        const load = input.loads?.[index];
        const without = this.store.simulateWithout(index);
        if (!load || !without) return null;
        return {
          index,
          label: load.label,
          deviceId: load.deviceId,
          inverter: formatW(without.inverter.nominalW),
          storage: formatKwh(without.battery.capacityWh),
          panels: without.pv.count,
          saving:
            r.inverter.nominalW !== without.inverter.nominalW ||
            r.battery.capacityWh !== without.battery.capacityWh ||
            r.pv.count !== without.pv.count,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  });

  protected removeHeavy(deviceId: string | undefined, label: string): void {
    const load = this.store
      .loads()
      .find((l) => (deviceId ? l.deviceId === deviceId : l.label === label));
    if (load) {
      this.store.removeLoad(load.key);
      this.store.flush();
    }
  }
}
