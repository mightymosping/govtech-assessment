import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient, type Prisma } from '@prisma/client';

type AzureMysqlAdapterConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  ssl: { rejectUnauthorized: boolean };
};

const DEFAULT_MYSQL_PORT = 3306;
const AZURE_MYSQL_HOST_SUFFIX = '.mysql.database.azure.com';

export const getAzureMysqlAdapterConfig = (
  databaseUrl: string,
): AzureMysqlAdapterConfig | null => {
  try {
    const parsedUrl = new URL(databaseUrl);

    if (
      parsedUrl.protocol !== 'mysql:' ||
      !parsedUrl.hostname.endsWith(AZURE_MYSQL_HOST_SUFFIX)
    ) {
      return null;
    }

    const databaseName = parsedUrl.pathname.replace(/^\//, '');

    return {
      host: parsedUrl.hostname,
      port: parsedUrl.port ? Number(parsedUrl.port) : DEFAULT_MYSQL_PORT,
      user: decodeURIComponent(parsedUrl.username),
      password: decodeURIComponent(parsedUrl.password),
      database: databaseName || undefined,
      ssl: { rejectUnauthorized: false },
    };
  } catch {
    return null;
  }
};

const createPrismaClient = (): PrismaClient => {
  const adapterConfig = getAzureMysqlAdapterConfig(
    process.env.DATABASE_URL ?? '',
  );

  if (!adapterConfig) {
    return new PrismaClient();
  }

  return new PrismaClient({
    adapter: new PrismaMariaDb(adapterConfig),
  });
};

export const prisma = createPrismaClient();

export type PrismaClientLike = Pick<
  PrismaClient,
  '$disconnect' | '$queryRawUnsafe'
>;

export type TeacherStudentPrismaClientLike = Pick<
  PrismaClient,
  '$transaction' | 'student' | 'teacher' | 'teacherStudent'
>;

export type TeacherStudentPrismaTransactionLike = Pick<
  Prisma.TransactionClient,
  'student' | 'teacher' | 'teacherStudent'
>;

export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
};
