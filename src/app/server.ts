import 'dotenv/config';

import type { Express } from 'express';
import type { Server } from 'node:http';

import { createApp } from './app';
import { getEnv, type Env } from '../config/env';
import { disconnectPrisma } from '../database/prisma';
import { logger, type LoggerLike } from '../shared/logging/logger';

type ServerLike = {
  close: (callback: (error?: Error) => void) => unknown;
};

type ProcessLike = {
  once: NodeJS.Process['once'];
};

type ExitHandler = (code: number) => void;

export type ShutdownHandler = (signal: NodeJS.Signals) => Promise<void>;

type ShutdownDependencies = {
  disconnect: () => Promise<void>;
  exit: ExitHandler;
  logger: Pick<LoggerLike, 'error' | 'info' | 'warn'>;
  processRef: ProcessLike;
  server: ServerLike;
  signals?: NodeJS.Signals[];
};

type StartServerOptions = {
  app?: Express;
  envInput?: NodeJS.ProcessEnv;
  exit?: ExitHandler;
  listen?: (app: Express, port: number) => Promise<ServerLike> | ServerLike;
  processRef?: ProcessLike;
};

const defaultSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

const closeServer = async (server: ServerLike): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);

        return;
      }

      resolve();
    });
  });
};

export const createGracefulShutdownHandler = ({
  disconnect,
  exit,
  logger: shutdownLogger,
  server,
}: ShutdownDependencies): ShutdownHandler => {
  let shuttingDown = false;

  return async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) {
      shutdownLogger.warn({ signal }, 'Shutdown already in progress');

      return;
    }

    shuttingDown = true;
    shutdownLogger.info({ signal }, 'Received shutdown signal');

    try {
      await closeServer(server);
      shutdownLogger.info('HTTP server closed');
      await disconnect();
      shutdownLogger.info('Prisma disconnected');
      exit(0);
    } catch (error) {
      shutdownLogger.error({ err: error, signal }, 'Graceful shutdown failed');
      exit(1);
    }
  };
};

export const registerGracefulShutdown = (
  dependencies: ShutdownDependencies,
): ShutdownHandler => {
  const handler = createGracefulShutdownHandler(dependencies);
  const signals = dependencies.signals ?? defaultSignals;

  for (const signal of signals) {
    dependencies.processRef.once(signal, () => {
      void handler(signal);
    });
  }

  return handler;
};

const defaultListen = (app: Express, port: number): Promise<Server> => {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info({ port }, 'Server listening');
      queueMicrotask(() => {
        resolve(server);
      });
    });
  });
};

export const startServer = async (
  options: StartServerOptions = {},
): Promise<{ app: Express; env: Env; server: ServerLike }> => {
  const env = getEnv(options.envInput);
  const app = options.app ?? createApp();
  const processRef = options.processRef ?? process;
  const exit = options.exit ?? ((code: number) => process.exit(code));
  const listen = options.listen ?? defaultListen;
  const server = await Promise.resolve(listen(app, env.PORT));

  registerGracefulShutdown({
    disconnect: disconnectPrisma,
    exit,
    logger,
    processRef,
    server,
  });

  return { app, env, server };
};

/* c8 ignore next 3 */
if (require.main === module) {
  void startServer();
}
