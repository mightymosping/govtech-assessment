import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  LOG_LEVEL: z.string().default('info'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(80),
});

export type Env = z.infer<typeof envSchema>;

export const getEnv = (input: NodeJS.ProcessEnv = process.env): Env => {
  return envSchema.parse(input);
};
