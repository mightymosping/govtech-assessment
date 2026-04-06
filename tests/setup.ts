process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'mysql://app:app@localhost:3306/teacher_admin';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

afterEach(() => {
  jest.restoreAllMocks();
});
