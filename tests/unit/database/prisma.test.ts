import {
  disconnectPrisma,
  getAzureMysqlAdapterConfig,
  prisma,
} from '../../../src/database/prisma';

describe('getAzureMysqlAdapterConfig', () => {
  it('returns an SSL-enabled adapter config for Azure MySQL URLs', () => {
    expect(
      getAzureMysqlAdapterConfig(
        'mysql://mysqladmin:p%40ssword@server.mysql.database.azure.com:3307/teacher_admin',
      ),
    ).toEqual({
      host: 'server.mysql.database.azure.com',
      port: 3307,
      user: 'mysqladmin',
      password: 'p@ssword',
      database: 'teacher_admin',
      ssl: { rejectUnauthorized: false },
    });
  });

  it('returns null for non-Azure MySQL URLs', () => {
    expect(
      getAzureMysqlAdapterConfig(
        'mysql://app:app@localhost:3306/teacher_admin',
      ),
    ).toBeNull();
  });

  it('returns null for invalid URLs', () => {
    expect(getAzureMysqlAdapterConfig('not-a-url')).toBeNull();
  });

  it('uses default port 3306 when no port is specified in the URL', () => {
    expect(
      getAzureMysqlAdapterConfig(
        'mysql://mysqladmin:password@server.mysql.database.azure.com/teacher_admin',
      ),
    ).toEqual({
      host: 'server.mysql.database.azure.com',
      port: 3306,
      user: 'mysqladmin',
      password: 'password',
      database: 'teacher_admin',
      ssl: { rejectUnauthorized: false },
    });
  });

  it('returns undefined for database when no database path is specified', () => {
    expect(
      getAzureMysqlAdapterConfig(
        'mysql://mysqladmin:password@server.mysql.database.azure.com:3306',
      ),
    ).toEqual({
      host: 'server.mysql.database.azure.com',
      port: 3306,
      user: 'mysqladmin',
      password: 'password',
      database: undefined,
      ssl: { rejectUnauthorized: false },
    });
  });
});

describe('createPrismaClient with Azure DATABASE_URL', () => {
  it('creates PrismaClient with PrismaMariaDb adapter for Azure MySQL DATABASE_URL', () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL =
      'mysql://mysqladmin:password@server.mysql.database.azure.com:3307/teacher_admin';

    jest.isolateModules(() => {
      const mockAdapter = { type: 'mariadb-adapter' };
      const mockPrismaMariaDb = jest.fn().mockReturnValue(mockAdapter);
      const mockPrismaClient = jest.fn().mockReturnValue({ $disconnect: jest.fn() });

      jest.mock('@prisma/adapter-mariadb', () => ({
        PrismaMariaDb: mockPrismaMariaDb,
      }));
      jest.mock('@prisma/client', () => ({
        PrismaClient: mockPrismaClient,
      }));

      require('../../../src/database/prisma');

      expect(mockPrismaMariaDb).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient).toHaveBeenCalledWith({ adapter: mockAdapter });
    });

    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it('creates PrismaClient without adapter when DATABASE_URL is undefined', () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    jest.isolateModules(() => {
      const mockPrismaClient = jest.fn().mockReturnValue({ $disconnect: jest.fn() });

      jest.mock('@prisma/adapter-mariadb', () => ({
        PrismaMariaDb: jest.fn(),
      }));
      jest.mock('@prisma/client', () => ({
        PrismaClient: mockPrismaClient,
      }));

      require('../../../src/database/prisma');

      expect(mockPrismaClient).toHaveBeenCalledWith();
    });

    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });
});

describe('prisma helpers', () => {
  it('disconnects via the shared prisma client', async () => {
    const disconnectSpy = jest
      .spyOn(prisma, '$disconnect')
      .mockResolvedValue(undefined);

    await disconnectPrisma();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
