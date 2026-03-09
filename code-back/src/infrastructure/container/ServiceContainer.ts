import { UserPrismaRepository } from '@infrastructure/prisma/UserPrismaRepository';
import { ClientPrismaRepository } from '@infrastructure/prisma/ClientPrismaRepository';
import { SalePrismaRepository } from '@infrastructure/prisma/SalePrismaRepository';
import { ProductPrismaRepository } from '@infrastructure/prisma/ProductPrismaRepository';
import { SaleStatusPrismaRepository } from '@infrastructure/prisma/SaleStatusPrismaRepository';

import { RegisterUserUseCase } from '@application/use-cases/user/RegisterUserUseCase';
import { LoginUserUseCase } from '@application/use-cases/user/LoginUserUseCase';
import { RefreshTokenUseCase } from '@application/use-cases/user/RefreshTokenUseCase';
import { LogoutUserUseCase } from '@application/use-cases/user/LogoutUserUseCase';
import { GetAllUsersUseCase } from '@application/use-cases/user/GetAllUsersUseCase';
import { DeleteUserUseCase } from '@application/use-cases/user/DeleteUserUseCase';
import { UpdateUserUseCase } from '@application/use-cases/user/UpdateUserUseCase';

import { CreateClientUseCase } from '@application/use-cases/client/CreateClientUseCase';
import { GetClientUseCase } from '@application/use-cases/client/GetClientUseCase';
import { UpdateClientUseCase } from '@application/use-cases/client/UpdateClientUseCase';
import { PushDataClientUseCase } from '@application/use-cases/client/PushDataClientUseCase';

import { AddSaleItemUseCase } from '@application/use-cases/sale/AddSaleItemUseCase';
import { ChangeSaleStatusUseCase } from '@application/use-cases/sale/ChangeSaleStatusUseCase';
import { CreateSaleWithProductsUseCase } from '@application/use-cases/sale/CreateSaleWithProductsUseCase';
import { ListSalesWithFiltersUseCase } from '@application/use-cases/sale/ListSalesWithFiltersUseCase';
import { RemoveSaleItemUseCase } from '@application/use-cases/sale/RemoveSaleItemUseCase';
import { UpdateSaleItemUseCase } from '@application/use-cases/sale/UpdateSaleItemUseCase';
import { UpdateClientSnapshotUseCase } from '@application/use-cases/sale/UpdateClientSnapshotUseCase';
import { GetSalesStatsUseCase } from '@application/use-cases/sale/GetSalesStatsUseCase';

import { CreateProductUseCase } from '@application/use-cases/product/CreateProductUseCase';
import { UpdateProductUseCase } from '@application/use-cases/product/UpdateProductUseCase';
import { ToggleProductActiveUseCase } from '@application/use-cases/product/ToggleProductActiveUseCase';
import { ListProductsUseCase } from '@application/use-cases/product/ListProductsUseCase';
import { GetProductUseCase } from '@application/use-cases/product/GetProductUseCase';

import { CreateSaleStatusUseCase } from '@application/use-cases/saleStatus/CreateSaleStatusUseCase';
import { UpdateSaleStatusUseCase } from '@application/use-cases/saleStatus/UpdateSaleStatusUseCase';
import { ListSaleStatusUseCase } from '@application/use-cases/saleStatus/ListSaleStatusUseCase';
import { ReorderSaleStatusesUseCase } from '@application/use-cases/saleStatus/ReorderSaleStatusesUseCase';
import { DeleteSaleStatusUseCase } from '@application/use-cases/saleStatus/DeleteSaleStatusUseCase';

import { RecordingPrismaRepository } from '@infrastructure/prisma/RecordingPrismaRepository';
import { UploadRecordingUseCase } from '@application/use-cases/recording/UploadRecordingUseCase';
import { ListRecordingsUseCase } from '@application/use-cases/recording/ListRecordingsUseCase';
import { DownloadRecordingUseCase } from '@application/use-cases/recording/DownloadRecordingUseCase';
import { DeleteRecordingUseCase } from '@application/use-cases/recording/DeleteRecordingUseCase';

import { AllowedIpPrismaRepository } from '@infrastructure/prisma/AllowedIpPrismaRepository';
import { ListAllowedIpsUseCase } from '@application/use-cases/allowedIp/ListAllowedIpsUseCase';
import { CreateAllowedIpUseCase } from '@application/use-cases/allowedIp/CreateAllowedIpUseCase';
import { DeleteAllowedIpUseCase } from '@application/use-cases/allowedIp/DeleteAllowedIpUseCase';
import { SystemSettingPrismaRepository } from '@infrastructure/prisma/SystemSettingPrismaRepository';

import { SignatureRequestPrismaRepository } from '@infrastructure/prisma/SignatureRequestPrismaRepository';
import { MockSignatureProvider } from '@infrastructure/signature/MockSignatureProvider';
import { LleidaSignatureProvider } from '@infrastructure/signature/LleidaSignatureProvider';
import { PdfGenerator } from '@infrastructure/signature/PdfGenerator';
import type { ISignatureProvider } from '@domain/services/ISignatureProvider';
import { GenerateAndSendContractUseCase } from '@application/use-cases/signature/GenerateAndSendContractUseCase';
import { ResendSignatureRequestUseCase } from '@application/use-cases/signature/ResendSignatureRequestUseCase';
import { GetSignatureStatusUseCase } from '@application/use-cases/signature/GetSignatureStatusUseCase';
import { HandleSignatureWebhookUseCase } from '@application/use-cases/signature/HandleSignatureWebhookUseCase';
import { CancelSignatureRequestUseCase } from '@application/use-cases/signature/CancelSignatureRequestUseCase';

import { GetSystemSettingUseCase } from '@application/use-cases/settings/GetSystemSettingUseCase';
import { SetSystemSettingUseCase } from '@application/use-cases/settings/SetSystemSettingUseCase';

import { HealthChecker } from '@infrastructure/express/health/HealthChecker';
import { AppConfig, loadConfig } from '@infrastructure/config/AppConfig';
import logger from '@infrastructure/observability/logger/logger';

/**
 * Contenedor de servicios singleton avanzado para inyección de dependencias
 */
class ServiceContainer {
  private static instance: ServiceContainer;

  // Configuración
  private _config?: AppConfig;

  // Repositorios
  private _userRepository?: UserPrismaRepository;
  private _clientRepository?: ClientPrismaRepository;
  private _saleRepository?: SalePrismaRepository;
  private _productRepository?: ProductPrismaRepository;
  private _saleStatusRepository?: SaleStatusPrismaRepository;

  // Casos de uso de Usuario
  private _registerUserUseCase?: RegisterUserUseCase;
  private _loginUserUseCase?: LoginUserUseCase;
  private _refreshTokenUseCase?: RefreshTokenUseCase;
  private _logoutUserUseCase?: LogoutUserUseCase;
  private _getAllUsersUseCase?: GetAllUsersUseCase;
  private _deleteUserUseCase?: DeleteUserUseCase;
  private _updateUserUseCase?: UpdateUserUseCase;

  // Casos de uso de Cliente
  private _createClientUseCase?: CreateClientUseCase;
  private _getClientUseCase?: GetClientUseCase;
  private _updateClientUseCase?: UpdateClientUseCase;
  private _pushDataClientUseCase?: PushDataClientUseCase;

  // Casos de uso de Venta
  private _createSaleWithProductsUseCase?: CreateSaleWithProductsUseCase;
  private _listSalesWithFiltersUseCase?: ListSalesWithFiltersUseCase;
  private _addSaleItemUseCase?: AddSaleItemUseCase;
  private _updateSaleItemUseCase?: UpdateSaleItemUseCase;
  private _removeSaleItemUseCase?: RemoveSaleItemUseCase;
  private _changeSaleStatusUseCase?: ChangeSaleStatusUseCase;
  private _updateClientSnapshotUseCase?: UpdateClientSnapshotUseCase;
  private _getSalesStatsUseCase?: GetSalesStatsUseCase;

  // Casos de uso de Producto
  private _createProductUseCase?: CreateProductUseCase;
  private _updateProductUseCase?: UpdateProductUseCase;
  private _toggleProductActiveUseCase?: ToggleProductActiveUseCase;
  private _listProductsUseCase?: ListProductsUseCase;
  private _getProductUseCase?: GetProductUseCase;

  // Casos de uso de Estado de Venta
  private _createSaleStatusUseCase?: CreateSaleStatusUseCase;
  private _updateSaleStatusUseCase?: UpdateSaleStatusUseCase;
  private _listSaleStatusUseCase?: ListSaleStatusUseCase;
  private _reorderSaleStatusesUseCase?: ReorderSaleStatusesUseCase;
  private _deleteSaleStatusUseCase?: DeleteSaleStatusUseCase;

  // Repositorio y Casos de uso de Grabación
  private _recordingRepository?: RecordingPrismaRepository;
  private _uploadRecordingUseCase?: UploadRecordingUseCase;
  private _listRecordingsUseCase?: ListRecordingsUseCase;
  private _downloadRecordingUseCase?: DownloadRecordingUseCase;
  private _deleteRecordingUseCase?: DeleteRecordingUseCase;

  // Repositorio y Casos de uso de AllowedIp
  private _allowedIpRepository?: AllowedIpPrismaRepository;
  private _listAllowedIpsUseCase?: ListAllowedIpsUseCase;
  private _createAllowedIpUseCase?: CreateAllowedIpUseCase;
  private _deleteAllowedIpUseCase?: DeleteAllowedIpUseCase;

  // Repositorio de configuración del sistema
  private _systemSettingRepository?: SystemSettingPrismaRepository;
  private _getSystemSettingUseCase?: GetSystemSettingUseCase;
  private _setSystemSettingUseCase?: SetSystemSettingUseCase;

  // Repositorio y Casos de uso de Firma Electrónica
  private _signatureRequestRepository?: SignatureRequestPrismaRepository;
  private _mockSignatureProvider?: MockSignatureProvider;
  private _lleidaSignatureProvider?: LleidaSignatureProvider;
  private _signatureProvider?: ISignatureProvider;
  private _pdfGenerator?: PdfGenerator;
  private _generateAndSendContractUseCase?: GenerateAndSendContractUseCase;
  private _resendSignatureRequestUseCase?: ResendSignatureRequestUseCase;
  private _getSignatureStatusUseCase?: GetSignatureStatusUseCase;
  private _handleSignatureWebhookUseCase?: HandleSignatureWebhookUseCase;
  private _cancelSignatureRequestUseCase?: CancelSignatureRequestUseCase;

  private _healthChecker?: HealthChecker;

  private constructor() {}

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  // CONFIGURACIÓN
  get config(): AppConfig {
    if (!this._config) {
      this._config = loadConfig();
      logger.info('Configuration loaded', {
        environment: this._config.app.environment,
        version: this._config.app.version,
        database: {
          poolSize: this._config.database.poolSize,
          timeout: this._config.database.timeout,
        },
      });
    }
    return this._config;
  }

  // REPOSITORIOS
  get userRepository(): UserPrismaRepository {
    if (!this._userRepository) {
      this._userRepository = new UserPrismaRepository();
    }
    return this._userRepository;
  }

  get clientRepository(): ClientPrismaRepository {
    if (!this._clientRepository) {
      this._clientRepository = new ClientPrismaRepository();
    }
    return this._clientRepository;
  }

  get saleRepository(): SalePrismaRepository {
    if (!this._saleRepository) {
      this._saleRepository = new SalePrismaRepository();
    }
    return this._saleRepository;
  }

  get productRepository(): ProductPrismaRepository {
    if (!this._productRepository) {
      this._productRepository = new ProductPrismaRepository();
    }
    return this._productRepository;
  }

  get saleStatusRepository(): SaleStatusPrismaRepository {
    if (!this._saleStatusRepository) {
      this._saleStatusRepository = new SaleStatusPrismaRepository();
    }
    return this._saleStatusRepository;
  }

  // CASOS DE USO: USUARIO
  get registerUserUseCase(): RegisterUserUseCase {
    if (!this._registerUserUseCase) {
      this._registerUserUseCase = new RegisterUserUseCase(this.userRepository);
    }
    return this._registerUserUseCase;
  }

  get loginUserUseCase(): LoginUserUseCase {
    if (!this._loginUserUseCase) {
      this._loginUserUseCase = new LoginUserUseCase(this.userRepository);
    }
    return this._loginUserUseCase;
  }

  get refreshTokenUseCase(): RefreshTokenUseCase {
    if (!this._refreshTokenUseCase) {
      this._refreshTokenUseCase = new RefreshTokenUseCase(this.userRepository);
    }
    return this._refreshTokenUseCase;
  }

  get logoutUserUseCase(): LogoutUserUseCase {
    if (!this._logoutUserUseCase) {
      this._logoutUserUseCase = new LogoutUserUseCase(this.userRepository);
    }
    return this._logoutUserUseCase;
  }

  get getAllUsersUseCase(): GetAllUsersUseCase {
    if (!this._getAllUsersUseCase) {
      this._getAllUsersUseCase = new GetAllUsersUseCase(this.userRepository);
    }
    return this._getAllUsersUseCase;
  }

  get deleteUserUseCase(): DeleteUserUseCase {
    if (!this._deleteUserUseCase) {
      this._deleteUserUseCase = new DeleteUserUseCase(this.userRepository);
    }
    return this._deleteUserUseCase;
  }

  get updateUserUseCase(): UpdateUserUseCase {
    if (!this._updateUserUseCase) {
      this._updateUserUseCase = new UpdateUserUseCase(this.userRepository);
    }
    return this._updateUserUseCase;
  }

  // CASOS DE USO: CLIENTE
  get createClientUseCase(): CreateClientUseCase {
    if (!this._createClientUseCase) {
      this._createClientUseCase = new CreateClientUseCase(this.clientRepository);
    }
    return this._createClientUseCase;
  }

  get getClientUseCase(): GetClientUseCase {
    if (!this._getClientUseCase) {
      this._getClientUseCase = new GetClientUseCase(this.clientRepository);
    }
    return this._getClientUseCase;
  }

  get updateClientUseCase(): UpdateClientUseCase {
    if (!this._updateClientUseCase) {
      this._updateClientUseCase = new UpdateClientUseCase(this.clientRepository);
    }
    return this._updateClientUseCase;
  }

  get pushDataClientUseCase(): PushDataClientUseCase {
    if (!this._pushDataClientUseCase) {
      this._pushDataClientUseCase = new PushDataClientUseCase(this.clientRepository);
    }
    return this._pushDataClientUseCase;
  }

  // CASOS DE USO: VENTA
  get createSaleWithProductsUseCase(): CreateSaleWithProductsUseCase {
    if (!this._createSaleWithProductsUseCase) {
      this._createSaleWithProductsUseCase = new CreateSaleWithProductsUseCase(
        this.saleRepository,
        this.saleStatusRepository,
        this.productRepository
      );
    }
    return this._createSaleWithProductsUseCase;
  }

  get listSalesWithFiltersUseCase(): ListSalesWithFiltersUseCase {
    if (!this._listSalesWithFiltersUseCase) {
      this._listSalesWithFiltersUseCase = new ListSalesWithFiltersUseCase(this.saleRepository);
    }
    return this._listSalesWithFiltersUseCase;
  }

  get addSaleItemUseCase(): AddSaleItemUseCase {
    if (!this._addSaleItemUseCase) {
      this._addSaleItemUseCase = new AddSaleItemUseCase(this.saleRepository);
    }
    return this._addSaleItemUseCase;
  }

  get updateSaleItemUseCase(): UpdateSaleItemUseCase {
    if (!this._updateSaleItemUseCase) {
      this._updateSaleItemUseCase = new UpdateSaleItemUseCase(this.saleRepository);
    }
    return this._updateSaleItemUseCase;
  }

  get removeSaleItemUseCase(): RemoveSaleItemUseCase {
    if (!this._removeSaleItemUseCase) {
      this._removeSaleItemUseCase = new RemoveSaleItemUseCase(this.saleRepository);
    }
    return this._removeSaleItemUseCase;
  }

  get changeSaleStatusUseCase(): ChangeSaleStatusUseCase {
    if (!this._changeSaleStatusUseCase) {
      this._changeSaleStatusUseCase = new ChangeSaleStatusUseCase(
        this.saleRepository,
        this.saleStatusRepository,
        this.signatureRequestRepository
      );
    }
    return this._changeSaleStatusUseCase;
  }

  get updateClientSnapshotUseCase(): UpdateClientSnapshotUseCase {
    if (!this._updateClientSnapshotUseCase) {
      this._updateClientSnapshotUseCase = new UpdateClientSnapshotUseCase(this.saleRepository);
    }
    return this._updateClientSnapshotUseCase;
  }

  get getSalesStatsUseCase(): GetSalesStatsUseCase {
    if (!this._getSalesStatsUseCase) {
      this._getSalesStatsUseCase = new GetSalesStatsUseCase();
    }
    return this._getSalesStatsUseCase;
  }

  // CASOS DE USO: PRODUCTO
  get createProductUseCase(): CreateProductUseCase {
    if (!this._createProductUseCase) {
      this._createProductUseCase = new CreateProductUseCase(this.productRepository);
    }
    return this._createProductUseCase;
  }

  get updateProductUseCase(): UpdateProductUseCase {
    if (!this._updateProductUseCase) {
      this._updateProductUseCase = new UpdateProductUseCase(this.productRepository);
    }
    return this._updateProductUseCase;
  }

  get toggleProductActiveUseCase(): ToggleProductActiveUseCase {
    if (!this._toggleProductActiveUseCase) {
      this._toggleProductActiveUseCase = new ToggleProductActiveUseCase(this.productRepository);
    }
    return this._toggleProductActiveUseCase;
  }

  get listProductsUseCase(): ListProductsUseCase {
    if (!this._listProductsUseCase) {
      this._listProductsUseCase = new ListProductsUseCase(this.productRepository);
    }
    return this._listProductsUseCase;
  }

  get getProductUseCase(): GetProductUseCase {
    if (!this._getProductUseCase) {
      this._getProductUseCase = new GetProductUseCase(this.productRepository);
    }
    return this._getProductUseCase;
  }

  // CASOS DE USO: ESTADO DE VENTA
  get createSaleStatusUseCase(): CreateSaleStatusUseCase {
    if (!this._createSaleStatusUseCase) {
      this._createSaleStatusUseCase = new CreateSaleStatusUseCase(this.saleStatusRepository);
    }
    return this._createSaleStatusUseCase;
  }

  get updateSaleStatusUseCase(): UpdateSaleStatusUseCase {
    if (!this._updateSaleStatusUseCase) {
      this._updateSaleStatusUseCase = new UpdateSaleStatusUseCase(this.saleStatusRepository);
    }
    return this._updateSaleStatusUseCase;
  }

  get listSaleStatusUseCase(): ListSaleStatusUseCase {
    if (!this._listSaleStatusUseCase) {
      this._listSaleStatusUseCase = new ListSaleStatusUseCase(this.saleStatusRepository);
    }
    return this._listSaleStatusUseCase;
  }

  get reorderSaleStatusesUseCase(): ReorderSaleStatusesUseCase {
    if (!this._reorderSaleStatusesUseCase) {
      this._reorderSaleStatusesUseCase = new ReorderSaleStatusesUseCase(this.saleStatusRepository);
    }
    return this._reorderSaleStatusesUseCase;
  }

  get deleteSaleStatusUseCase(): DeleteSaleStatusUseCase {
    if (!this._deleteSaleStatusUseCase) {
      this._deleteSaleStatusUseCase = new DeleteSaleStatusUseCase(this.saleStatusRepository);
    }
    return this._deleteSaleStatusUseCase;
  }

  // REPOSITORIO: RECORDING
  get recordingRepository(): RecordingPrismaRepository {
    if (!this._recordingRepository) {
      this._recordingRepository = new RecordingPrismaRepository();
    }
    return this._recordingRepository;
  }

  // CASOS DE USO: RECORDING
  get uploadRecordingUseCase(): UploadRecordingUseCase {
    if (!this._uploadRecordingUseCase) {
      this._uploadRecordingUseCase = new UploadRecordingUseCase(
        this.recordingRepository,
        this.saleRepository
      );
    }
    return this._uploadRecordingUseCase;
  }

  get listRecordingsUseCase(): ListRecordingsUseCase {
    if (!this._listRecordingsUseCase) {
      this._listRecordingsUseCase = new ListRecordingsUseCase(
        this.recordingRepository,
        this.saleRepository
      );
    }
    return this._listRecordingsUseCase;
  }

  get downloadRecordingUseCase(): DownloadRecordingUseCase {
    if (!this._downloadRecordingUseCase) {
      this._downloadRecordingUseCase = new DownloadRecordingUseCase(this.recordingRepository);
    }
    return this._downloadRecordingUseCase;
  }

  get deleteRecordingUseCase(): DeleteRecordingUseCase {
    if (!this._deleteRecordingUseCase) {
      this._deleteRecordingUseCase = new DeleteRecordingUseCase(
        this.recordingRepository,
        this.saleRepository
      );
    }
    return this._deleteRecordingUseCase;
  }

  // REPOSITORIO: ALLOWED IP
  get allowedIpRepository(): AllowedIpPrismaRepository {
    if (!this._allowedIpRepository) {
      this._allowedIpRepository = new AllowedIpPrismaRepository();
    }
    return this._allowedIpRepository;
  }

  // CASOS DE USO: ALLOWED IP
  get listAllowedIpsUseCase(): ListAllowedIpsUseCase {
    if (!this._listAllowedIpsUseCase) {
      this._listAllowedIpsUseCase = new ListAllowedIpsUseCase(this.allowedIpRepository);
    }
    return this._listAllowedIpsUseCase;
  }

  get createAllowedIpUseCase(): CreateAllowedIpUseCase {
    if (!this._createAllowedIpUseCase) {
      this._createAllowedIpUseCase = new CreateAllowedIpUseCase(this.allowedIpRepository);
    }
    return this._createAllowedIpUseCase;
  }

  get deleteAllowedIpUseCase(): DeleteAllowedIpUseCase {
    if (!this._deleteAllowedIpUseCase) {
      this._deleteAllowedIpUseCase = new DeleteAllowedIpUseCase(this.allowedIpRepository);
    }
    return this._deleteAllowedIpUseCase;
  }

  // REPOSITORIO: SYSTEM SETTING
  get systemSettingRepository(): SystemSettingPrismaRepository {
    if (!this._systemSettingRepository) {
      this._systemSettingRepository = new SystemSettingPrismaRepository();
    }
    return this._systemSettingRepository;
  }

  // CASOS DE USO: SYSTEM SETTING
  get getSystemSettingUseCase(): GetSystemSettingUseCase {
    if (!this._getSystemSettingUseCase) {
      this._getSystemSettingUseCase = new GetSystemSettingUseCase(this.systemSettingRepository);
    }
    return this._getSystemSettingUseCase;
  }

  get setSystemSettingUseCase(): SetSystemSettingUseCase {
    if (!this._setSystemSettingUseCase) {
      this._setSystemSettingUseCase = new SetSystemSettingUseCase(this.systemSettingRepository);
    }
    return this._setSystemSettingUseCase;
  }

  // REPOSITORIO: SIGNATURE REQUEST
  get signatureRequestRepository(): SignatureRequestPrismaRepository {
    if (!this._signatureRequestRepository) {
      this._signatureRequestRepository = new SignatureRequestPrismaRepository();
    }
    return this._signatureRequestRepository;
  }

  get mockSignatureProvider(): MockSignatureProvider {
    if (!this._mockSignatureProvider) {
      this._mockSignatureProvider = new MockSignatureProvider();
    }
    return this._mockSignatureProvider;
  }

  get lleidaSignatureProvider(): LleidaSignatureProvider {
    if (!this._lleidaSignatureProvider) {
      const apiKey = process.env.LLEIDA_API_KEY!;
      const user = process.env.LLEIDA_USER!;
      const configId = parseInt(process.env.LLEIDA_CONFIG_ID_CORREO || '0', 10);
      const configIdSms = process.env.LLEIDA_CONFIG_ID_SMS
        ? parseInt(process.env.LLEIDA_CONFIG_ID_SMS, 10)
        : undefined;
      this._lleidaSignatureProvider = new LleidaSignatureProvider(apiKey, user, configId, configIdSms);
    }
    return this._lleidaSignatureProvider;
  }

  /** Proveedor activo: usa Lleida.net si las credenciales están configuradas, si no el mock */
  get signatureProvider(): ISignatureProvider {
    if (!this._signatureProvider) {
      const useMock = process.env.LLEIDA_USE_MOCK === 'true';
      const apiKey = process.env.LLEIDA_API_KEY;
      if (!useMock && apiKey && apiKey !== 'your_api_key_here') {
        logger.info('[Firma] Usando LleidaSignatureProvider (Click & Sign)');
        this._signatureProvider = this.lleidaSignatureProvider;
      } else {
        logger.info('[Firma] Usando MockSignatureProvider (modo demo/desarrollo)');
        this._signatureProvider = this.mockSignatureProvider;
      }
    }
    return this._signatureProvider;
  }

  get pdfGenerator(): PdfGenerator {
    if (!this._pdfGenerator) {
      this._pdfGenerator = new PdfGenerator();
    }
    return this._pdfGenerator;
  }

  // CASOS DE USO: FIRMA ELECTRÓNICA
  get generateAndSendContractUseCase(): GenerateAndSendContractUseCase {
    if (!this._generateAndSendContractUseCase) {
      this._generateAndSendContractUseCase = new GenerateAndSendContractUseCase(
        this.saleRepository,
        this.signatureRequestRepository,
        this.signatureProvider,
        this.pdfGenerator,
        this.systemSettingRepository
      );
    }
    return this._generateAndSendContractUseCase;
  }

  get resendSignatureRequestUseCase(): ResendSignatureRequestUseCase {
    if (!this._resendSignatureRequestUseCase) {
      this._resendSignatureRequestUseCase = new ResendSignatureRequestUseCase(
        this.saleRepository,
        this.signatureRequestRepository,
        this.signatureProvider,
        this.pdfGenerator,
        this.systemSettingRepository
      );
    }
    return this._resendSignatureRequestUseCase;
  }

  get getSignatureStatusUseCase(): GetSignatureStatusUseCase {
    if (!this._getSignatureStatusUseCase) {
      this._getSignatureStatusUseCase = new GetSignatureStatusUseCase(
        this.signatureRequestRepository,
        this.signatureProvider,
        this.handleSignatureWebhookUseCase
      );
    }
    return this._getSignatureStatusUseCase;
  }

  get handleSignatureWebhookUseCase(): HandleSignatureWebhookUseCase {
    if (!this._handleSignatureWebhookUseCase) {
      this._handleSignatureWebhookUseCase = new HandleSignatureWebhookUseCase(
        this.signatureRequestRepository,
        this.saleRepository,
        this.saleStatusRepository
      );
    }
    return this._handleSignatureWebhookUseCase;
  }

  get cancelSignatureRequestUseCase(): CancelSignatureRequestUseCase {
    if (!this._cancelSignatureRequestUseCase) {
      this._cancelSignatureRequestUseCase = new CancelSignatureRequestUseCase(
        this.signatureRequestRepository,
        this.signatureProvider,
        this.saleRepository
      );
    }
    return this._cancelSignatureRequestUseCase;
  }

  // SERVICIOS EXTERNOS
  get healthChecker(): HealthChecker {
    if (!this._healthChecker) {
      this._healthChecker = new HealthChecker(
        this.userRepository,
        this.clientRepository,
        this.saleRepository,
        this.config.app.version,
        this.config.app.environment
      );
      logger.info('Health checker initialized');
    }
    return this._healthChecker;
  }

  // UTILIDADES
  getSystemInfo() {
    return {
      app: this.config.app,
      services: {
        database: {
          connected: true,
          poolSize: this.config.database.poolSize,
        },
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  configureEnvironment(newConfig: Partial<AppConfig>): void {
    if (this._config) {
      this._config = { ...this._config, ...newConfig };
      logger.info('Configuration updated', newConfig);
    }
  }

  public reset(): void {
    // Repositorios
    this._userRepository = undefined;
    this._clientRepository = undefined;
    this._saleRepository = undefined;
    this._productRepository = undefined;
    this._saleStatusRepository = undefined;

    // Use Cases: Usuario
    this._registerUserUseCase = undefined;
    this._loginUserUseCase = undefined;
    this._refreshTokenUseCase = undefined;
    this._logoutUserUseCase = undefined;
    this._getAllUsersUseCase = undefined;
    this._deleteUserUseCase = undefined;
    this._updateUserUseCase = undefined;

    // Use Cases: Cliente
    this._createClientUseCase = undefined;
    this._getClientUseCase = undefined;
    this._updateClientUseCase = undefined;
    this._pushDataClientUseCase = undefined;

    // Use Cases: Venta
    this._createSaleWithProductsUseCase = undefined;
    this._listSalesWithFiltersUseCase = undefined;
    this._addSaleItemUseCase = undefined;
    this._updateSaleItemUseCase = undefined;
    this._removeSaleItemUseCase = undefined;
    this._changeSaleStatusUseCase = undefined;
    this._updateClientSnapshotUseCase = undefined;
    this._getSalesStatsUseCase = undefined;

    // Use Cases: Producto
    this._createProductUseCase = undefined;
    this._updateProductUseCase = undefined;
    this._toggleProductActiveUseCase = undefined;
    this._listProductsUseCase = undefined;
    this._getProductUseCase = undefined;

    // Use Cases: Estado de Venta
    this._createSaleStatusUseCase = undefined;
    this._updateSaleStatusUseCase = undefined;
    this._listSaleStatusUseCase = undefined;
    this._reorderSaleStatusesUseCase = undefined;
    this._deleteSaleStatusUseCase = undefined;

    // Recording
    this._recordingRepository = undefined;
    this._uploadRecordingUseCase = undefined;
    this._listRecordingsUseCase = undefined;
    this._downloadRecordingUseCase = undefined;
    this._deleteRecordingUseCase = undefined;

    // AllowedIp
    this._allowedIpRepository = undefined;
    this._listAllowedIpsUseCase = undefined;
    this._createAllowedIpUseCase = undefined;
    this._deleteAllowedIpUseCase = undefined;
    this._systemSettingRepository = undefined;
    this._getSystemSettingUseCase = undefined;
    this._setSystemSettingUseCase = undefined;

    // Firma Electrónica
    this._signatureRequestRepository = undefined;
    this._mockSignatureProvider = undefined;
    this._lleidaSignatureProvider = undefined;
    this._signatureProvider = undefined;
    this._pdfGenerator = undefined;
    this._generateAndSendContractUseCase = undefined;
    this._resendSignatureRequestUseCase = undefined;
    this._getSignatureStatusUseCase = undefined;
    this._handleSignatureWebhookUseCase = undefined;
    this._cancelSignatureRequestUseCase = undefined;

    this._healthChecker = undefined;

    logger.info('ServiceContainer reset completed');
  }

  public resetAll(): void {
    this.reset();
    this._config = undefined;
    logger.info('ServiceContainer complete reset (including config)');
  }
}

export const serviceContainer = ServiceContainer.getInstance();
