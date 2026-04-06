import type { IncomingMessage, ServerResponse } from 'node:http';

import pino, { type Logger } from 'pino';
import pinoHttp, { type Options } from 'pino-http';

type HttpLoggerRequest = IncomingMessage & {
  requestId?: string;
};

type HttpLoggerResponse = ServerResponse<IncomingMessage>;

type HttpRequestIdSource = {
  id?: IncomingMessage['id'];
  requestId?: string;
};

export const getLoggerLevel = (): string => {
  return process.env.LOG_LEVEL ?? 'info';
};

export const getHttpRequestId = (req: HttpRequestIdSource): string => {
  return req.requestId ?? String(req.id ?? 'unknown-request');
};

export const getHttpRequestProps = (req: HttpRequestIdSource) => {
  return {
    requestId: req.requestId ?? req.id,
  };
};

export const logger = pino({
  level: getLoggerLevel(),
  base: undefined,
  messageKey: 'message',
});

export type LoggerLike = Pick<Logger, 'child' | 'error' | 'info' | 'warn'>;

export const createHttpLogger = () => {
  const options: Options<HttpLoggerRequest, HttpLoggerResponse> = {
    customProps: (req) => getHttpRequestProps(req),
    genReqId: (req) => getHttpRequestId(req),
    logger,
    quietReqLogger: true,
  };

  return pinoHttp<HttpLoggerRequest, HttpLoggerResponse>(options);
};
