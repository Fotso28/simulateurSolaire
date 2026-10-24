import type { SimulationStore } from './simulation.store';

/** Cas de référence du TRD (Douala, 3 277 Wh/j) saisi en « Autre appareil ». */
export const DOUALA_LOADS = [
  { label: 'Ampoule LED', powerW: 10, quantity: 6, hoursPerDay: 6 },
  { label: 'Télévision 43 pouces', powerW: 80, quantity: 1, hoursPerDay: 5 },
  { label: 'Décodeur TV', powerW: 15, quantity: 1, hoursPerDay: 5 },
  { label: 'Ventilateur', powerW: 60, quantity: 2, hoursPerDay: 8 },
  { label: 'Chargeur de téléphone', powerW: 10, quantity: 3, hoursPerDay: 3 },
  { label: 'Box internet', powerW: 10, quantity: 1, hoursPerDay: 24 },
];

/**
 * Le réfrigérateur du cas de référence (120 W, 24 h, cycle 0,4, démarrage ×4)
 * vient du catalogue pour garder son taux de fonctionnement : on le force à 120 W.
 */
export function enterDouala(store: SimulationStore): void {
  store.reset();
  store.setRegion('cm-littoral');
  store.setMode('particulier');
  for (const l of DOUALA_LOADS) store.addCustom(l);
  const fridge = store.catalog().devices.find((d) => d.id === 'fridge');
  if (!fridge) throw new Error('fridge absent du catalogue');
  store.setQuantity(fridge, 1);
  store.loads.update((loads) =>
    loads.map((l) => (l.deviceId === 'fridge' ? { ...l, powerW: 120 } : l)),
  );
  store.flush();
}
