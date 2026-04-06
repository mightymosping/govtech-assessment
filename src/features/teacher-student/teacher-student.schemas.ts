import { z } from 'zod';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createRequiredEmailSchema = (
  missingMessage: string,
  invalidMessage: string,
) => {
  return z
    .string({ required_error: missingMessage })
    .trim()
    .superRefine((value, context) => {
      if (value.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: missingMessage,
        });

        return;
      }

      if (!emailPattern.test(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: invalidMessage,
        });
      }
    });
};

const teacherEmailSchema = createRequiredEmailSchema(
  'Teacher is missing',
  'Teacher is not in a valid format',
);

const studentEmailSchema = createRequiredEmailSchema(
  'Student is missing',
  'Student is not in a valid format',
);

const studentsSchema = z
  .array(z.string(), {
    required_error: 'Must contain at least one student',
  })
  .min(1, 'Must contain at least one student')
  .superRefine((students, context) => {
    if (students.some((student) => !emailPattern.test(student.trim()))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'One or more students is not in a valid format',
        path: [],
      });
    }
  })
  .transform((students) => students.map((student) => student.trim()));

const teacherQuerySchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (typeof value === 'undefined') {
      return [] as string[];
    }

    const teacherValues = Array.isArray(value) ? value : [value];

    return teacherValues
      .map((teacher) => teacher.trim())
      .filter((teacher) => teacher.length > 0);
  })
  .superRefine((teachers, context) => {
    if (teachers.some((teacher) => !emailPattern.test(teacher))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'One or more teachers is not in a valid format',
      });
    }
  });

export const registerBodySchema = z.object({
  students: studentsSchema,
  teacher: teacherEmailSchema,
});

export const commonStudentsQuerySchema = z.object({
  teacher: teacherQuerySchema,
});

export const suspendBodySchema = z.object({
  student: studentEmailSchema,
});

export const retrieveForNotificationsBodySchema = z.object({
  notification: z
    .string({ required_error: 'Notification is missing' })
    .trim()
    .min(1, 'Notification is missing'),
  teacher: teacherEmailSchema,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type CommonStudentsQuery = z.infer<typeof commonStudentsQuerySchema>;
export type SuspendBody = z.infer<typeof suspendBodySchema>;
export type RetrieveForNotificationsBody = z.infer<
  typeof retrieveForNotificationsBodySchema
>;
