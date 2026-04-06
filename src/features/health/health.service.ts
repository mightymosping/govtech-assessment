import type { PrismaClientLike } from '../../database/prisma';
import { prisma } from '../../database/prisma';
import { ExternalDependencyAppError } from '../../shared/errors/app-error';
import { getRequestLogger } from '../../middleware/request-context';

export type HealthResponse = {
  database: 'up';
  status: 'ok';
  timestamp: string;
};

export class HealthService {
  public constructor(private readonly db: PrismaClientLike = prisma) {}

  public async getHealth(): Promise<HealthResponse> {
    try {
      await this.db.$queryRawUnsafe('SELECT 1');
    } catch (error) {
      getRequestLogger().error({ err: error }, 'Health database check failed');
      throw new ExternalDependencyAppError(
        'Database health check failed',
        error,
      );
    }

    return {
      database: 'up',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
