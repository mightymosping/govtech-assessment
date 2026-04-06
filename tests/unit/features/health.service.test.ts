import { HealthService } from '../../../src/features/health/health.service';
import { ExternalDependencyAppError } from '../../../src/shared/errors/app-error';

describe('HealthService', () => {
  it('returns the health payload when the database check succeeds', async () => {
    const query = jest.fn().mockResolvedValue([{ 1: 1 }]);
    const service = new HealthService({
      $disconnect: jest.fn(),
      $queryRawUnsafe: query,
    });

    const result = await service.getHealth();

    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(result.timestamp).toEqual(expect.any(String));
  });

  it('throws an external dependency error when the database check fails', async () => {
    const service = new HealthService({
      $disconnect: jest.fn(),
      $queryRawUnsafe: jest.fn().mockRejectedValue(new Error('offline')),
    });

    await expect(service.getHealth()).rejects.toBeInstanceOf(
      ExternalDependencyAppError,
    );
  });
});
