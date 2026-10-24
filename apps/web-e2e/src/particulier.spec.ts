import { expect, test } from '@playwright/test';
import {
  chooseAutonomy,
  collectErrors,
  enterDoualaDevices,
  expectNoHorizontalScroll,
  isDesktop,
  startJourney,
} from './support';

test('parcours particulier complet (Douala) en 3G simulée', async ({
  page,
  context,
}) => {
  test.slow();
  const errors = collectErrors(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  // « Fast 3G » de Chrome DevTools : 562,5 ms de latence, 1,44 Mbit/s ↓, 675 kbit/s ↑.
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 562.5,
    downloadThroughput: (1.44 * 1024 * 1024) / 8,
    uploadThroughput: (675 * 1024) / 8,
  });

  await startJourney(page, 'particulier');
  await expectNoHorizontalScroll(page);
  await enterDoualaDevices(page);
  await expectNoHorizontalScroll(page);
  await chooseAutonomy(page);

  if (isDesktop(page)) {
    await expect(
      page.getByRole('heading', { name: 'Votre installation recommandée' }),
    ).toBeVisible();
  } else {
    await expect(
      page.getByRole('heading', { name: 'Notre proposition' }),
    ).toBeVisible();
  }
  await expect(page.getByText('Consommation estimée').first()).toBeVisible();
  await expectNoHorizontalScroll(page);

  // Configurateur : page dédiée sur mobile, panneau latéral sur desktop.
  if (!isDesktop(page)) {
    await page.getByRole('link', { name: "Ajuster l'installation" }).click();
    await expect(page).toHaveURL(/\/configurateur$/);
  }
  // Panneau compact sur desktop (sans sections ni badge) : boutons ‹ › par leur
  // nom, état « modifié » lu sur « Revenir à la proposition ».
  const reset = page.getByRole('button', { name: 'Revenir à la proposition' });
  await expect(reset).toBeDisabled();
  await page.getByRole('button', { name: 'Un panneau de plus' }).click();
  await expect(reset).toBeEnabled();
  if (!isDesktop(page)) {
    await expect(page.getByText('Modifié', { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Un panneau de moins' }).click();
  await page.getByRole('button', { name: 'Plus de stockage' }).click();
  await expect(reset).toBeEnabled();
  await expectNoHorizontalScroll(page);

  await page
    .getByRole('link', {
      name: isDesktop(page)
        ? 'Voir la liste du matériel'
        : 'Valider et voir le matériel',
    })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/recapitulatif$/);
  await expect(
    page.getByRole('heading', { name: 'Schéma de câblage' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Nomenclature' }),
  ).toBeVisible();
  await expectNoHorizontalScroll(page);

  expect(errors).toEqual([]);
});
