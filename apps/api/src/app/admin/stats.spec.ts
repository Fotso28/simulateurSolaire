import { ApiError } from '../common/api-error';
import type { PrismaService } from '../prisma/prisma.service';
import { StatsController } from './governance-admin.controller';

describe('StatsController', () => {
  it('refuse une période dont le début suit la fin', async () => {
    const controller = new StatsController({} as PrismaService);
    await expect(
      controller.simulations({ from: '2026-02-01', to: '2026-01-01' }),
    ).rejects.toMatchObject({
      constructor: ApiError,
      response: { code: 'INVALID_PERIOD', field: 'from' },
    });
  });
});
