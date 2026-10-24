import { expect, test } from '@playwright/test';

const ONE_MB = 1024 * 1024;

test.describe('performance', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'mesure via CDP');

  test('première page < 1 Mo transférés (cache vide)', async ({
    page,
    context,
  }, testInfo) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    let total = 0;
    cdp.on('Network.loadingFinished', (e) => {
      total += e.encodedDataLength;
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(
      page.getByRole('heading', { name: /Où sera installé votre système/ }),
    ).toBeVisible();

    const kb = Math.round(total / 1024);
    testInfo.annotations.push({
      type: 'poids',
      description: `${kb} Ko transférés`,
    });
    console.log(`[${testInfo.project.name}] première page : ${kb} Ko`);
    expect(total).toBeLessThan(ONE_MB);
  });
});
