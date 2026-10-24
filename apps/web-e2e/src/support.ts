import { expect, type Page, test } from '@playwright/test';

/** Appareils du foyer de référence de Douala (RF, cas de recette ≈ 3,3 kWh/j). */
export const DOUALA_CUSTOM = [
  { label: 'Ampoule LED', powerW: 10, quantity: 6, hours: 6 },
  { label: 'Télévision 43 pouces', powerW: 80, quantity: 1, hours: 5 },
  { label: 'Décodeur TV', powerW: 15, quantity: 1, hours: 5 },
  { label: 'Ventilateur', powerW: 60, quantity: 2, hours: 8 },
  { label: 'Chargeur de téléphone', powerW: 10, quantity: 3, hours: 3 },
  { label: 'Box internet', powerW: 10, quantity: 1, hours: 24 },
];

export const isDesktop = (page: Page) =>
  (page.viewportSize()?.width ?? 0) >= 1024;

/** Le bouton visible parmi les doublons mobile / desktop. */
export const visibleButton = (page: Page, name: string | RegExp) =>
  page.getByRole('button', { name }).filter({ visible: true }).first();

/** Erreurs console et exceptions, hors 503 attendus de `/api` (pas d'API en e2e). */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (/status of 503/.test(text)) return;
    errors.push(text);
  });
  return errors;
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(
    overflow,
    `défilement horizontal sur ${page.url()}`,
  ).toBeLessThanOrEqual(0);
}

/** `/` → Littoral → profil (particulier ou pro), arrive sur `/besoins`. */
export async function startJourney(
  page: Page,
  mode: 'particulier' | 'pro',
): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /Littoral/ }).click();
  await expect(page.getByRole('button', { name: /Littoral/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('link', { name: 'Continuer' }).click();
  await expect(page).toHaveURL(/\/mode$/);
  await page
    .getByRole('button', {
      name:
        mode === 'pro'
          ? /Oui, je connais mes puissances/
          : /Non, je liste mes appareils/,
    })
    .click();
  await expect(page).toHaveURL(/\/besoins$/);
}

/** Saisit le foyer de référence de Douala sur `/besoins` (particulier). */
export async function enterDoualaDevices(page: Page): Promise<void> {
  await test.step('foyer de référence de Douala', async () => {
    for (const d of DOUALA_CUSTOM) {
      await visibleButton(page, /Autre appareil/).click();
      const form = page.getByRole('form', {
        name: 'Ajouter un autre appareil',
      });
      await form.getByLabel("Nom de l'appareil").fill(d.label);
      await form.getByLabel('Puissance (W)').fill(String(d.powerW));
      await form.getByLabel('Heures par jour').fill(String(d.hours));
      await form.getByRole('button', { name: "Ajouter l'appareil" }).click();
      for (let q = 1; q < d.quantity; q++) {
        await visibleButton(page, `Ajouter un appareil : ${d.label}`).click();
      }
    }
    // Réfrigérateur du catalogue (catégorie « Froid »).
    await visibleButton(page, /^Froid/).click();
    await visibleButton(page, 'Ajouter : Réfrigérateur').click();
    await expect(page.getByText(/kWh\s*\/\s*jour/).first()).toBeVisible();
  });
}

/** `/besoins` → 1 jour, lithium → `/resultat`. */
export async function chooseAutonomy(page: Page): Promise<void> {
  await visibleButton(page, 'Continuer').click();
  await expect(page).toHaveURL(/\/autonomie$/);
  const tiers = page.getByRole('region', { name: 'Autonomie souhaitée' });
  const oneDay = tiers.getByRole('button', { name: /Une journée/ });
  await oneDay.click();
  await expect(oneDay).toHaveAttribute('aria-pressed', 'true');
  const lithium = page.getByRole('button', { name: /^Lithium/ });
  await lithium.click();
  await expect(lithium).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Voir ma proposition' }).click();
  await expect(page).toHaveURL(/\/resultat$/);
}

/** Parcours particulier complet jusqu'à `/recapitulatif` (sans configurateur). */
export async function reachRecap(page: Page): Promise<void> {
  await startJourney(page, 'particulier');
  await enterDoualaDevices(page);
  await chooseAutonomy(page);
  await page
    .getByRole('link', { name: 'Voir la liste du matériel' })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/recapitulatif$/);
  await expect(
    page.getByRole('heading', { name: 'Nomenclature' }),
  ).toBeVisible();
}
