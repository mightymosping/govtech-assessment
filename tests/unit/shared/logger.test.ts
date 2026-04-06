describe('logger helpers', () => {
  afterEach(() => {
    delete process.env.LOG_LEVEL;
    jest.resetModules();
  });

  it('uses info as the default log level', async () => {
    delete process.env.LOG_LEVEL;

    const { getLoggerLevel } =
      await import('../../../src/shared/logging/logger');

    expect(getLoggerLevel()).toBe('info');
  });

  it('uses the configured log level when provided', async () => {
    process.env.LOG_LEVEL = 'debug';

    const { getLoggerLevel } =
      await import('../../../src/shared/logging/logger');

    expect(getLoggerLevel()).toBe('debug');
  });

  it('prefers requestId over the fallback request id sources', async () => {
    const { getHttpRequestId, getHttpRequestProps } =
      await import('../../../src/shared/logging/logger');

    expect(
      getHttpRequestId({ id: 'request-id', requestId: 'context-id' }),
    ).toBe('context-id');
    expect(
      getHttpRequestProps({ id: 'request-id', requestId: 'context-id' }),
    ).toEqual({ requestId: 'context-id' });
  });

  it('falls back to req.id and finally to unknown-request', async () => {
    const { getHttpRequestId, getHttpRequestProps } =
      await import('../../../src/shared/logging/logger');

    expect(getHttpRequestId({ id: 'request-id' })).toBe('request-id');
    expect(getHttpRequestProps({ id: 'request-id' })).toEqual({
      requestId: 'request-id',
    });
    expect(getHttpRequestId({})).toBe('unknown-request');
    expect(getHttpRequestProps({})).toEqual({ requestId: undefined });
  });

  it('creates the http logger middleware', async () => {
    const { createHttpLogger } =
      await import('../../../src/shared/logging/logger');

    expect(createHttpLogger()).toEqual(expect.any(Function));
  });
});
