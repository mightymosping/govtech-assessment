import { getEnv } from '../../../src/config/env';

describe('getEnv', () => {
  it('parses the minimal environment and applies defaults', () => {
    expect(
      getEnv({ DATABASE_URL: 'mysql://app:app@localhost:3306/teacher_admin' }),
    ).toEqual({
      DATABASE_URL: 'mysql://app:app@localhost:3306/teacher_admin',
      LOG_LEVEL: 'info',
      NODE_ENV: 'development',
      PORT: 80,
    });
  });

  it('throws when the database URL is missing', () => {
    expect(() => getEnv({})).toThrow('Required');
  });
});
