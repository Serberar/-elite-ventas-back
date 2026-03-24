export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  roots: ['<rootDir>/src/__tests__'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json', isolatedModules: true }],
  },
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/shared/(.*)$': '<rootDir>/src/application/shared/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
  },
  // Memoria: evitar acumulación de mocks y forzar salida limpia
  clearMocks: true,
  restoreMocks: true,
  forceExit: true,
  // Dividir suites en workers para que cada uno libere memoria al terminar
  // (en lugar de --runInBand que acumula todo en un proceso)
  maxWorkers: 4,
  workerIdleMemoryLimit: '512MB',
};
