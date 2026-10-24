import { expect, test } from '@playwright/test';
import { collectErrors, startJourney, visibleButton } from './support';

test('mode pro : dimensionnement en puissance totale', async ({ page }) => {
  const errors = collectErrors(page);
  await startJourney(page, 'pro');

  const entry = page.getByRole('group', { name: 'Mode de saisie' });
  const totals = entry.getByRole('button', {
    name: 'Puissance totale',
    exact: true,
  });
  await totals.click();
  await expect(totals).toHaveAttribute('aria-pressed', 'true');

  await page.getByLabel(/Puissance totale installée/).fill('435');
  await page.getByLabel(/Énergie journalière/).fill('3277');
  await visibleButton(page, /Dimensionner/).click();

  await expect(page).toHaveURL(/\/resultat$/);
  for (const name of ['Équipements', 'Câbles', 'Protections']) {
    await expect(page.getByRole('heading', { name })).toBeVisible();
  }
  await expect(
    page
      .getByRole('button', { name: 'Exporter la nomenclature (PDF)' })
      .first(),
  ).toBeAttached();
  expect(errors).toEqual([]);
});
