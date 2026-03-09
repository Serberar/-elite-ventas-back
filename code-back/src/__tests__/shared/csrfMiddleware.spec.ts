import { Request, Response, NextFunction } from 'express';

// Mock csrf-csrf BEFORE importing the module under test.
// doubleCsrf() is called at module-init time; jest.fn() inside factory is hoisted safely.
jest.mock('csrf-csrf', () => ({
  doubleCsrf: jest.fn().mockReturnValue({
    generateCsrfToken: jest.fn().mockReturnValue('test-csrf-token'),
    doubleCsrfProtection: jest.fn().mockImplementation(
      (_req: unknown, _res: unknown, callback: (err?: unknown) => void) => callback()
    ),
    invalidCsrfTokenError: new Error('Invalid CSRF token'),
  }),
}));

jest.mock('@infrastructure/observability/logger/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  default: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import { doubleCsrf } from 'csrf-csrf';
import {
  csrfProtection,
  csrfTokenEndpoint,
  csrfTokenGenerator,
} from '@infrastructure/express/middleware/csrfMiddleware';

describe('csrfMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let setHeaderMock: jest.Mock;

  // Captured once in beforeAll — survives jest.clearAllMocks() calls in beforeEach
  // (clearAllMocks only resets call history, not the object reference)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mocks: any;

  beforeAll(() => {
    mocks = (doubleCsrf as jest.Mock).mock.results[0].value;
  });

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    setHeaderMock = jest.fn();
    next = jest.fn();
    req = { ip: '127.0.0.1', headers: {}, socket: {} as never };
    res = { status: statusMock, json: jsonMock, setHeader: setHeaderMock };
    jest.clearAllMocks();

    // Restore default mock implementations after clearAllMocks
    (mocks.generateCsrfToken as jest.Mock).mockReturnValue('test-csrf-token');
    (mocks.doubleCsrfProtection as jest.Mock).mockImplementation(
      (_r: unknown, _re: unknown, cb: (err?: unknown) => void) => cb()
    );
  });

  afterEach(() => {
    delete process.env.USE_COOKIE_AUTH;
  });

  // ─── csrfProtection ──────────────────────────────────────────────────────────

  describe('csrfProtection', () => {
    describe('when USE_COOKIE_AUTH is not enabled', () => {
      it('should call next() directly without invoking doubleCsrfProtection', () => {
        process.env.USE_COOKIE_AUTH = 'false';

        csrfProtection(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
        expect(mocks.doubleCsrfProtection).not.toHaveBeenCalled();
      });

      it('should bypass when USE_COOKIE_AUTH is undefined', () => {
        delete process.env.USE_COOKIE_AUTH;

        csrfProtection(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(mocks.doubleCsrfProtection).not.toHaveBeenCalled();
      });
    });

    describe('when USE_COOKIE_AUTH=true', () => {
      beforeEach(() => {
        process.env.USE_COOKIE_AUTH = 'true';
      });

      it('should call next() when CSRF token is valid', () => {
        csrfProtection(req as Request, res as Response, next);

        expect(mocks.doubleCsrfProtection).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(undefined);
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should return 403 with CSRF_INVALID when token is invalid', () => {
        (mocks.doubleCsrfProtection as jest.Mock).mockImplementationOnce(
          (_r: unknown, _re: unknown, cb: (err?: unknown) => void) =>
            cb(mocks.invalidCsrfTokenError)
        );

        csrfProtection(req as Request, res as Response, next);

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          status: 'error',
          code: 'CSRF_INVALID',
          message: 'Token CSRF inválido o expirado',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should call next(error) when an unexpected error occurs', () => {
        const unexpectedError = new Error('Unexpected failure');
        (mocks.doubleCsrfProtection as jest.Mock).mockImplementationOnce(
          (_r: unknown, _re: unknown, cb: (err?: unknown) => void) => cb(unexpectedError)
        );

        csrfProtection(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(unexpectedError);
        expect(statusMock).not.toHaveBeenCalled();
      });
    });
  });

  // ─── csrfTokenEndpoint ───────────────────────────────────────────────────────

  describe('csrfTokenEndpoint', () => {
    it('should return csrfToken in response body', () => {
      csrfTokenEndpoint(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({ csrfToken: 'test-csrf-token' });
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 500 when generateCsrfToken throws', () => {
      (mocks.generateCsrfToken as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Generation error');
      });

      csrfTokenEndpoint(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        code: 'CSRF_ERROR',
        message: 'Error generando token CSRF',
      });
    });
  });

  // ─── csrfTokenGenerator ──────────────────────────────────────────────────────

  describe('csrfTokenGenerator', () => {
    it('should set X-CSRF-Token header and call next()', () => {
      csrfTokenGenerator(req as Request, res as Response, next);

      expect(setHeaderMock).toHaveBeenCalledWith('X-CSRF-Token', 'test-csrf-token');
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next(error) when generateCsrfToken throws', () => {
      const error = new Error('Token generation failed');
      (mocks.generateCsrfToken as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });

      csrfTokenGenerator(req as Request, res as Response, next as unknown as NextFunction);

      expect(next).toHaveBeenCalledWith(error);
      expect(setHeaderMock).not.toHaveBeenCalled();
    });
  });
});
