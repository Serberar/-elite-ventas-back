import { Request } from 'express';

jest.mock('multer', () => {
  const multerFn: any = jest.fn().mockReturnValue({ single: jest.fn() });
  multerFn.diskStorage = jest.fn().mockReturnValue('diskStorage');
  return multerFn;
});

jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-1234'),
}));

import multer from 'multer';
import fs from 'fs';
import { RECORDS_DIR, ALLOWED_MIMES, MAX_SIZE } from '@infrastructure/express/middleware/uploadMiddleware';

const multerAny = multer as any;

// Capture the config objects passed during module load
const diskStorageConfig = (multerAny.diskStorage as jest.Mock).mock.calls[0][0];
const multerConfig = (multerAny as jest.Mock).mock.calls[0][0];

describe('uploadMiddleware', () => {
  describe('constantes exportadas', () => {
    it('should export RECORDS_DIR with default value', () => {
      expect(RECORDS_DIR).toBe('./records');
    });

    it('should export MAX_SIZE default of 100MB', () => {
      expect(MAX_SIZE).toBe(104857600);
    });

    it('should export ALLOWED_MIMES with audio types', () => {
      expect(ALLOWED_MIMES).toContain('audio/mpeg');
      expect(ALLOWED_MIMES).toContain('audio/wav');
      expect(ALLOWED_MIMES).toContain('audio/ogg');
      expect(ALLOWED_MIMES).toContain('audio/webm');
      expect(ALLOWED_MIMES).toContain('audio/x-m4a');
    });

    it('should export ALLOWED_MIMES with video types', () => {
      expect(ALLOWED_MIMES).toContain('video/mp4');
      expect(ALLOWED_MIMES).toContain('video/webm');
      expect(ALLOWED_MIMES).toContain('video/ogg');
    });
  });

  describe('multer configuration', () => {
    it('should call multer.diskStorage to create storage', () => {
      // diskStorageConfig is captured at module load time (before clearMocks resets call counts)
      // so we verify the config object was captured (proving diskStorage was called)
      expect(diskStorageConfig).toBeDefined();
      expect(diskStorageConfig).toHaveProperty('destination');
      expect(diskStorageConfig).toHaveProperty('filename');
    });

    it('should configure multer with fileSize limit', () => {
      expect(multerConfig.limits).toEqual({ fileSize: MAX_SIZE });
    });
  });

  describe('fileFilter', () => {
    const { fileFilter } = multerConfig;

    it('should accept audio/mpeg files', () => {
      const cb = jest.fn();
      fileFilter({} as Request, { mimetype: 'audio/mpeg' } as Express.Multer.File, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should accept video/mp4 files', () => {
      const cb = jest.fn();
      fileFilter({} as Request, { mimetype: 'video/mp4' } as Express.Multer.File, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should accept audio/wav files', () => {
      const cb = jest.fn();
      fileFilter({} as Request, { mimetype: 'audio/wav' } as Express.Multer.File, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject text/plain with an error', () => {
      const cb = jest.fn();
      fileFilter({} as Request, { mimetype: 'text/plain' } as Express.Multer.File, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(Error));
      expect((cb.mock.calls[0][0] as Error).message).toContain('text/plain');
    });

    it('should reject image/jpeg with an error', () => {
      const cb = jest.fn();
      fileFilter({} as Request, { mimetype: 'image/jpeg' } as Express.Multer.File, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should mention allowed types in rejection message', () => {
      const cb = jest.fn();
      fileFilter({} as Request, { mimetype: 'application/pdf' } as Express.Multer.File, cb);
      expect((cb.mock.calls[0][0] as Error).message).toContain('audio/video');
    });
  });

  describe('storage destination', () => {
    const { destination } = diskStorageConfig;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create saleId subdirectory under RECORDS_DIR', () => {
      const cb = jest.fn();
      const req = { params: { saleId: 'sale-abc' } } as unknown as Request;

      destination(req, {} as Express.Multer.File, cb);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('sale-abc'),
        { recursive: true }
      );
      expect(cb).toHaveBeenCalledWith(null, expect.stringContaining('sale-abc'));
    });

    it('should call callback with error when saleId is missing', () => {
      const cb = jest.fn();
      const req = { params: {} } as unknown as Request;

      destination(req, {} as Express.Multer.File, cb);

      expect(cb).toHaveBeenCalledWith(expect.any(Error), '');
      expect((cb.mock.calls[0][0] as Error).message).toContain('saleId');
    });
  });

  describe('storage filename', () => {
    const { filename } = diskStorageConfig;

    it('should generate filename with uuid and original extension', () => {
      const cb = jest.fn();
      filename({} as Request, { originalname: 'grabacion.mp3' } as Express.Multer.File, cb);
      expect(cb).toHaveBeenCalledWith(null, 'test-uuid-1234.mp3');
    });

    it('should normalize extension to lowercase', () => {
      const cb = jest.fn();
      filename({} as Request, { originalname: 'audio.WAV' } as Express.Multer.File, cb);
      expect(cb).toHaveBeenCalledWith(null, 'test-uuid-1234.wav');
    });

    it('should work with video files', () => {
      const cb = jest.fn();
      filename({} as Request, { originalname: 'video.mp4' } as Express.Multer.File, cb);
      expect(cb).toHaveBeenCalledWith(null, 'test-uuid-1234.mp4');
    });
  });
});
