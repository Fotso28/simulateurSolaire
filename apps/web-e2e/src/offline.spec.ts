import { expect, test } from '@playwright/test';
import { reachRecap, visibleButton } from './support';

// Le service worker (ngsw) sert l'application une fois hors ligne.
test.use({ serviceWorkers: 'allow' });

test('hors-ligne : simulation possible et partage mis en file', async ({
  page,
  context,
}) => {
  test.slow();
  await page.goto('/');
  // Première visite : attendre que ngsw contrôle la page et ait tout préchargé.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const res = await fetch('/ngsw/state');
          return res.text();
        }),
      { timeout: 30_000 },
    )
    .toMatch(/Driver state: NORMAL/);
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          // Tous les fichiers du groupe « app » (prefetch) sont en cache.
          const manifest = await (await fetch('/ngsw.json')).json();
          const app = manifest.assetGroups.find(
            (g: { name: string }) => g.name === 'app',
          );
          const keys = await caches.keys();
          let cached = 0;
          for (const k of keys.filter((k) => k.includes(':assets:app:'))) {
            cached += (await (await caches.open(k)).keys()).length;
          }
          return cached >= app.urls.length;
        }),
      { timeout: 30_000 },
    )
    .toBe(true);

  await context.setOffline(true);
  await reachRecap(page);
  await expect(page.getByRole('status').first()).toContainText('Hors ligne');

  await visibleButton(page, 'Partager le lien').click();
  await expect(
    page.getByText(
      'Vous êtes hors ligne : la simulation sera enregistrée dès le retour du réseau.',
    ),
  ).toBeVisible();
  await expect(
    page.getByText('Hors ligne · 1 simulation en attente d’envoi'),
  ).toBeVisible();

  // Retour du réseau : la file est envoyée.
  let posted = 0;
  await context.route('**/api/v1/simulations', (route) => {
    posted++;
    return route.fulfill({ status: 201, json: { shareToken: 'enFile' } });
  });
  await context.setOffline(false);
  await expect(page.getByText('Simulation enregistrée.')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Voir le lien' }),
  ).toHaveAttribute('href', '/s/enFile');
  expect(posted).toBe(1);
});
