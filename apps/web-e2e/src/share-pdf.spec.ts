import { expect, test } from '@playwright/test';
import { collectErrors, reachRecap, visibleButton } from './support';

const TOKEN = 'e2eTok3n';

test('partage par lien puis ouverture de /s/:token', async ({ page }) => {
  const errors = collectErrors(page);
  let saved: { input: unknown; result: unknown } | undefined;
  await page.route('**/api/v1/simulations', async (route) => {
    expect(route.request().method()).toBe('POST');
    saved = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { shareToken: TOKEN } });
  });
  await page.route(`**/api/v1/simulations/${TOKEN}`, (route) =>
    route.fulfill({
      json: {
        ...saved,
        shareToken: TOKEN,
        engineVersion: '1.0.0',
        paramsVersion: 'e2e',
        createdAt: '2026-10-24T08:00:00.000Z',
      },
    }),
  );
  // Web Share API simulée : l'URL partagée est relevée par le test.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        (window as unknown as { __shared: string }).__shared = data.url ?? '';
      },
    });
  });

  await reachRecap(page);
  const synthesis = page.getByRole('region', { name: 'Synthèse' });
  const original = (await synthesis.innerText()).replace(/^.*\n/, '');
  await visibleButton(page, 'Partager le lien').click();
  await expect
    .poll(() => page.evaluate(() => (window as { __shared?: string }).__shared))
    .toMatch(new RegExp(`/s/${TOKEN}$`));
  expect(saved).toMatchObject({
    input: { regionId: 'cm-littoral', autonomyDays: 1, batteryTech: 'lithium' },
  });

  const url = await page.evaluate(
    () => (window as unknown as { __shared: string }).__shared,
  );
  await page.goto(new URL(url).pathname);
  await expect(page.getByRole('note')).toContainText(
    'Simulation partagée du 24/10/2026',
  );
  await expect(
    page.getByRole('heading', { name: 'Nomenclature' }),
  ).toBeVisible();
  // Même installation que celle partagée (hors date de la première ligne).
  await expect(synthesis).toContainText('Littoral (Douala)');
  expect((await synthesis.innerText()).replace(/^.*\n/, '')).toBe(original);
  expect(errors).toEqual([]);
});

test('lien de partage inconnu', async ({ page }) => {
  await page.route('**/api/v1/simulations/inconnu', (route) =>
    route.fulfill({
      status: 404,
      json: { code: 'NOT_FOUND', message: 'Simulation introuvable' },
    }),
  );
  await page.goto('/s/inconnu');
  await expect(
    page.getByRole('heading', { name: 'Simulation introuvable' }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(
    'Ce lien ne correspond à aucune simulation enregistrée.',
  );
});

test('export PDF', async ({ page }) => {
  await page.route('**/api/v1/simulations', (route) =>
    route.fulfill({ status: 201, json: { shareToken: TOKEN } }),
  );
  await reachRecap(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    visibleButton(page, 'Télécharger le PDF').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^simulation-solaire-.+\.pdf$/);
  const path = await download.path();
  const { readFile } = await import('node:fs/promises');
  const head = (await readFile(path)).subarray(0, 5).toString();
  expect(head).toBe('%PDF-');
});
