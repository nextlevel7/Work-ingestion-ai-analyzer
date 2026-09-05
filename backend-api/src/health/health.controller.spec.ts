import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { describe, expect, it, jest } from '@jest/globals';

describe('HealthController', () => {
  it('returns ok when the database check succeeds', async () => {
    const prisma = {
      $queryRaw: jest
        .fn<() => Promise<{ result: number }[]>>()
        .mockResolvedValue([{ result: 1 }]),
    } as unknown as PrismaService;
    const controller = new HealthController(prisma);

    await expect(controller.getHealth()).resolves.toEqual({ ok: true });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
