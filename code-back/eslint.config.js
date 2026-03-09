const eslint = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettierPlugin = require('eslint-plugin-prettier');
const path = require('path');

module.exports = [
  // Archivos a ignorar globalmente
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'prisma/migrations/**',
      '*.config.js',
      'generate-structure.js',
      'jest.config.js',
      '.env*',
      'docs/**',
      // Archivos legacy con problemas de tipado
      'scripts/generate-structure.js',
      'src/infrastructure/routes/genericProxyRoutes.ts',
      'src/infrastructure/routes/proxyRoutes.ts',
    ],
  },

  // Reglas base de ESLint
  eslint.configs.recommended,

  // Configuración TypeScript
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname,
        ecmaVersion: 2025,
        sourceType: 'module',
      },
      globals: {
        // Node.js globales
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        global: 'readonly',
        URL: 'readonly',
        crypto: 'readonly',
        NodeJS: 'readonly',

        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      /** TypeScript estrictas para producción **/
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/require-await': 'error',

      /** Código general **/
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      /** Prettier **/
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },

  // Configuración para archivos JavaScript (CommonJS)
  {
    files: ['*.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'script',
      },
    },
  },

  // Overrides para tests (flexibles)
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/jest.setup.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },

  // Overrides para entidades (permisivas con parámetros de constructor)
  {
    files: ['**/domain/entities/*.ts'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // Overrides para interfaces de repositorios (permisivas con parámetros de métodos)
  {
    files: ['**/domain/repositories/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'none', // No verificar argumentos de funciones/métodos
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
        }
      ],
      'no-unused-vars': 'off', // Usar solo la regla de TypeScript
    },
  },

  // Overrides para Use Cases (permitir parámetros de constructor privados)
  {
    files: ['**/application/use-cases/**/*.ts'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // Overrides para HealthChecker (permitir parámetros de constructor privados)
  {
    files: ['**/shared/health/HealthChecker.ts'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
