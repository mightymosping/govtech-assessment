import type { ZodError, ZodIssue } from 'zod';

const ROOT_KEY = 'root';

const formatPath = (path: ZodIssue['path']): string => {
  if (path.length === 0) {
    return ROOT_KEY;
  }

  return path.reduce<string>((result, segment) => {
    if (typeof segment === 'number') {
      return `${result}[${segment}]`;
    }

    if (result.length === 0) {
      return segment;
    }

    return `${result}.${segment}`;
  }, '');
};

export const formatZodError = (error: ZodError): Record<string, string[]> => {
  return error.issues.reduce<Record<string, string[]>>((result, issue) => {
    const key = formatPath(issue.path);
    const currentMessages = result[key] ?? [];

    result[key] = [...currentMessages, issue.message];

    return result;
  }, {});
};
