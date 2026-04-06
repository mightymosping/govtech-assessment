import type { Express } from 'express';

import {
  createGracefulShutdownHandler,
  registerGracefulShutdown,
  startServer,
} from '../../../src/app/server';
import * as prismaModule from '../../../src/database/prisma';
import { logger } from '../../../src/shared/logging/logger';

describe('server bootstrap', () => {
  const createLogger = () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  });

  it('closes the server, disconnects prisma, and exits cleanly', async () => {
    const logger = createLogger();
    const server = {
      close: jest.fn((callback: (error?: Error) => void) => callback()),
    };
    const disconnect = jest.fn().mockResolvedValue(undefined);
    const exit = jest.fn();
    const handler = createGracefulShutdownHandler({
      disconnect,
      exit,
      logger,
      processRef: process,
      server,
    });

    await handler('SIGTERM');

    expect(server.close).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('warns when shutdown is triggered more than once', async () => {
    let resolveClose: (() => void) | undefined;
    const logger = createLogger();
    const server = {
      close: jest.fn(
        (callback: (error?: Error) => void) =>
          new Promise<void>((resolve) => {
            resolveClose = () => {
              callback();
              resolve();
            };
          }),
      ),
    };
    const handler = createGracefulShutdownHandler({
      disconnect: jest.fn().mockResolvedValue(undefined),
      exit: jest.fn(),
      logger,
      processRef: process,
      server,
    });

    const firstCall = handler('SIGINT');
    const secondCall = handler('SIGTERM');

    await secondCall;
    resolveClose?.();
    await firstCall;

    expect(logger.warn).toHaveBeenCalledWith(
      { signal: 'SIGTERM' },
      'Shutdown already in progress',
    );
  });

  it('reports shutdown failures and exits with code 1', async () => {
    const logger = createLogger();
    const exit = jest.fn();
    const handler = createGracefulShutdownHandler({
      disconnect: jest.fn().mockResolvedValue(undefined),
      exit,
      logger,
      processRef: process,
      server: {
        close: jest.fn((callback: (error?: Error) => void) =>
          callback(new Error('close failed')),
        ),
      },
    });

    await handler('SIGTERM');

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('registers shutdown handlers for each signal', async () => {
    const once = jest.fn();
    const processRef = { once };
    const disconnect = jest.fn().mockResolvedValue(undefined);
    const server = {
      close: jest.fn((callback: (error?: Error) => void) => callback()),
    };

    registerGracefulShutdown({
      disconnect,
      exit: jest.fn(),
      logger: createLogger(),
      processRef,
      server,
    });

    expect(once).toHaveBeenCalledTimes(2);
    expect(once).toHaveBeenNthCalledWith(1, 'SIGINT', expect.any(Function));
    expect(once).toHaveBeenNthCalledWith(2, 'SIGTERM', expect.any(Function));

    const sigintHandler = once.mock.calls[0]?.[1] as () => void;
    const sigtermHandler = once.mock.calls[1]?.[1] as () => void;

    sigintHandler();
    sigtermHandler();

    await Promise.resolve();
    await Promise.resolve();

    expect(server.close).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('starts the server with the parsed environment', async () => {
    const once = jest.fn();
    const listen = jest.fn().mockResolvedValue({
      close: jest.fn((callback: (error?: Error) => void) => callback()),
    });

    const result = await startServer({
      app: {} as Express,
      envInput: {
        DATABASE_URL: 'mysql://app:app@localhost:3306/teacher_admin',
        PORT: '80',
      },
      exit: jest.fn(),
      listen,
      processRef: { once },
    });

    expect(result.env.PORT).toBe(80);
    expect(listen).toHaveBeenCalledWith(result.app, 80);
    expect(once).toHaveBeenCalledTimes(2);
  });

  it('uses the built-in listen implementation when one is not injected', async () => {
    const once = jest.fn();
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(jest.fn());
    const server = {
      close: jest.fn((callback: (error?: Error) => void) => callback()),
    };
    const app = {
      listen: jest.fn((port: number, callback: () => void) => {
        callback();

        return server;
      }),
    } as unknown as Express;

    const result = await startServer({
      app,
      envInput: {
        DATABASE_URL: 'mysql://app:app@localhost:3306/teacher_admin',
        PORT: '80',
      },
      exit: jest.fn(),
      processRef: { once },
    });

    expect(result.server).toBe(server);
    expect(app.listen).toHaveBeenCalledWith(80, expect.any(Function));
    expect(infoSpy).toHaveBeenCalledWith({ port: 80 }, 'Server listening');
  });

  it('uses the default app and process bindings when not injected', async () => {
    const onceSpy = jest.spyOn(process, 'once');
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never);
    const listen = jest.fn().mockResolvedValue({
      close: jest.fn((callback: (error?: Error) => void) => callback()),
    });
    const disconnectSpy = jest
      .spyOn(prismaModule, 'disconnectPrisma')
      .mockResolvedValue(undefined);

    const result = await startServer({
      envInput: {
        DATABASE_URL: 'mysql://app:app@localhost:3306/teacher_admin',
        PORT: '80',
      },
      listen,
    });

    expect(typeof result.app.use).toBe('function');
    expect(listen).toHaveBeenCalledWith(result.app, 80);
    expect(onceSpy).toHaveBeenCalledTimes(2);

    const sigintHandler = onceSpy.mock.calls[0]?.[1] as () => void;

    sigintHandler();

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);

    onceSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
