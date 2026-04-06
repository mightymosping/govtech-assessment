import { ZodError } from 'zod';

import { formatZodError } from '../../../src/shared/utils/zod-error';

describe('formatZodError', () => {
  it('aggregates nested validation issues into field arrays', () => {
    const error = new ZodError([
      {
        code: 'custom',
        message: 'Invalid format',
        path: ['teacher'],
      },
      {
        code: 'custom',
        message: 'Invalid format',
        path: ['students'],
      },
      {
        code: 'custom',
        message: 'Must contain at least 1 item',
        path: ['students'],
      },
      {
        code: 'custom',
        message: 'Invalid email format',
        path: ['students', 0],
      },
      {
        code: 'custom',
        message: 'Nested object issue',
        path: ['teacher', 'email'],
      },
      {
        code: 'custom',
        message: 'Root issue',
        path: [],
      },
    ]);

    expect(formatZodError(error)).toEqual({
      root: ['Root issue'],
      students: ['Invalid format', 'Must contain at least 1 item'],
      'students[0]': ['Invalid email format'],
      'teacher.email': ['Nested object issue'],
      teacher: ['Invalid format'],
    });
  });
});
