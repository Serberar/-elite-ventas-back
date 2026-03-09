"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceContainer = void 0;
const UserPrismaRepository_1 = require("../prisma/UserPrismaRepository");
const ClientPrismaRepository_1 = require("../prisma/ClientPrismaRepository");
const SalePrismaRepository_1 = require("../prisma/SalePrismaRepository");
const ProductPrismaRepository_1 = require("../prisma/ProductPrismaRepository");
const SaleStatusPrismaRepository_1 = require("../prisma/SaleStatusPrismaRepository");
const RegisterUserUseCase_1 = require("../../application/use-cases/user/RegisterUserUseCase");
const LoginUserUseCase_1 = require("../../application/use-cases/user/LoginUserUseCase");
const RefreshTokenUseCase_1 = require("../../application/use-cases/user/RefreshTokenUseCase");
const LogoutUserUseCase_1 = require("../../application/use-cases/user/LogoutUserUseCase");
const CreateClientUseCase_1 = require("../../application/use-cases/client/CreateClientUseCase");
const GetClientUseCase_1 = require("../../application/use-cases/client/GetClientUseCase");
const UpdateClientUseCase_1 = require("../../application/use-cases/client/UpdateClientUseCase");
const PushDataClientUseCase_1 = require("../../application/use-cases/client/PushDataClientUseCase");
const AddSaleItemUseCase_1 = require("../../application/use-cases/sale/AddSaleItemUseCase");
const ChangeSaleStatusUseCase_1 = require("../../application/use-cases/sale/ChangeSaleStatusUseCase");
const CreateSaleWithProductsUseCase_1 = require("../../application/use-cases/sale/CreateSaleWithProductsUseCase");
const ListSalesWithFiltersUseCase_1 = require("../../application/use-cases/sale/ListSalesWithFiltersUseCase");
const RemoveSaleItemUseCase_1 = require("../../application/use-cases/sale/RemoveSaleItemUseCase");
const UpdateSaleItemUseCase_1 = require("../../application/use-cases/sale/UpdateSaleItemUseCase");
const UpdateClientSnapshotUseCase_1 = require("../../application/use-cases/sale/UpdateClientSnapshotUseCase");
const GetSalesStatsUseCase_1 = require("../../application/use-cases/sale/GetSalesStatsUseCase");
const CreateProductUseCase_1 = require("../../application/use-cases/product/CreateProductUseCase");
const UpdateProductUseCase_1 = require("../../application/use-cases/product/UpdateProductUseCase");
const ToggleProductActiveUseCase_1 = require("../../application/use-cases/product/ToggleProductActiveUseCase");
const ListProductsUseCase_1 = require("../../application/use-cases/product/ListProductsUseCase");
const GetProductUseCase_1 = require("../../application/use-cases/product/GetProductUseCase");
const CreateSaleStatusUseCase_1 = require("../../application/use-cases/saleStatus/CreateSaleStatusUseCase");
const UpdateSaleStatusUseCase_1 = require("../../application/use-cases/saleStatus/UpdateSaleStatusUseCase");
const ListSaleStatusUseCase_1 = require("../../application/use-cases/saleStatus/ListSaleStatusUseCase");
const ReorderSaleStatusesUseCase_1 = require("../../application/use-cases/saleStatus/ReorderSaleStatusesUseCase");
const DeleteSaleStatusUseCase_1 = require("../../application/use-cases/saleStatus/DeleteSaleStatusUseCase");
const RecordingPrismaRepository_1 = require("../prisma/RecordingPrismaRepository");
const UploadRecordingUseCase_1 = require("../../application/use-cases/recording/UploadRecordingUseCase");
const ListRecordingsUseCase_1 = require("../../application/use-cases/recording/ListRecordingsUseCase");
const DownloadRecordingUseCase_1 = require("../../application/use-cases/recording/DownloadRecordingUseCase");
const DeleteRecordingUseCase_1 = require("../../application/use-cases/recording/DeleteRecordingUseCase");
const HealthChecker_1 = require("../express/health/HealthChecker");
const AppConfig_1 = require("../config/AppConfig");
const logger_1 = __importDefault(require("../observability/logger/logger"));
/**
 * Contenedor de servicios singleton avanzado para inyección de dependencias
 */
class ServiceContainer {
    static instance;
    // Configuración
    _config;
    // Repositorios
    _userRepository;
    _clientRepository;
    _saleRepository;
    _productRepository;
    _saleStatusRepository;
    // Casos de uso de Usuario
    _registerUserUseCase;
    _loginUserUseCase;
    _refreshTokenUseCase;
    _logoutUserUseCase;
    // Casos de uso de Cliente
    _createClientUseCase;
    _getClientUseCase;
    _updateClientUseCase;
    _pushDataClientUseCase;
    // Casos de uso de Venta
    _createSaleWithProductsUseCase;
    _listSalesWithFiltersUseCase;
    _addSaleItemUseCase;
    _updateSaleItemUseCase;
    _removeSaleItemUseCase;
    _changeSaleStatusUseCase;
    _updateClientSnapshotUseCase;
    _getSalesStatsUseCase;
    // Casos de uso de Producto
    _createProductUseCase;
    _updateProductUseCase;
    _toggleProductActiveUseCase;
    _listProductsUseCase;
    _getProductUseCase;
    // Casos de uso de Estado de Venta
    _createSaleStatusUseCase;
    _updateSaleStatusUseCase;
    _listSaleStatusUseCase;
    _reorderSaleStatusesUseCase;
    _deleteSaleStatusUseCase;
    // Repositorio y Casos de uso de Grabación
    _recordingRepository;
    _uploadRecordingUseCase;
    _listRecordingsUseCase;
    _downloadRecordingUseCase;
    _deleteRecordingUseCase;
    _healthChecker;
    constructor() { }
    static getInstance() {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer();
        }
        return ServiceContainer.instance;
    }
    // CONFIGURACIÓN
    get config() {
        if (!this._config) {
            this._config = (0, AppConfig_1.loadConfig)();
            logger_1.default.info('Configuration loaded', {
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
    get userRepository() {
        if (!this._userRepository) {
            this._userRepository = new UserPrismaRepository_1.UserPrismaRepository();
        }
        return this._userRepository;
    }
    get clientRepository() {
        if (!this._clientRepository) {
            this._clientRepository = new ClientPrismaRepository_1.ClientPrismaRepository();
        }
        return this._clientRepository;
    }
    get saleRepository() {
        if (!this._saleRepository) {
            this._saleRepository = new SalePrismaRepository_1.SalePrismaRepository();
        }
        return this._saleRepository;
    }
    get productRepository() {
        if (!this._productRepository) {
            this._productRepository = new ProductPrismaRepository_1.ProductPrismaRepository();
        }
        return this._productRepository;
    }
    get saleStatusRepository() {
        if (!this._saleStatusRepository) {
            this._saleStatusRepository = new SaleStatusPrismaRepository_1.SaleStatusPrismaRepository();
        }
        return this._saleStatusRepository;
    }
    // CASOS DE USO: USUARIO
    get registerUserUseCase() {
        if (!this._registerUserUseCase) {
            this._registerUserUseCase = new RegisterUserUseCase_1.RegisterUserUseCase(this.userRepository);
        }
        return this._registerUserUseCase;
    }
    get loginUserUseCase() {
        if (!this._loginUserUseCase) {
            this._loginUserUseCase = new LoginUserUseCase_1.LoginUserUseCase(this.userRepository);
        }
        return this._loginUserUseCase;
    }
    get refreshTokenUseCase() {
        if (!this._refreshTokenUseCase) {
            this._refreshTokenUseCase = new RefreshTokenUseCase_1.RefreshTokenUseCase(this.userRepository);
        }
        return this._refreshTokenUseCase;
    }
    get logoutUserUseCase() {
        if (!this._logoutUserUseCase) {
            this._logoutUserUseCase = new LogoutUserUseCase_1.LogoutUserUseCase(this.userRepository);
        }
        return this._logoutUserUseCase;
    }
    // CASOS DE USO: CLIENTE
    get createClientUseCase() {
        if (!this._createClientUseCase) {
            this._createClientUseCase = new CreateClientUseCase_1.CreateClientUseCase(this.clientRepository);
        }
        return this._createClientUseCase;
    }
    get getClientUseCase() {
        if (!this._getClientUseCase) {
            this._getClientUseCase = new GetClientUseCase_1.GetClientUseCase(this.clientRepository);
        }
        return this._getClientUseCase;
    }
    get updateClientUseCase() {
        if (!this._updateClientUseCase) {
            this._updateClientUseCase = new UpdateClientUseCase_1.UpdateClientUseCase(this.clientRepository);
        }
        return this._updateClientUseCase;
    }
    get pushDataClientUseCase() {
        if (!this._pushDataClientUseCase) {
            this._pushDataClientUseCase = new PushDataClientUseCase_1.PushDataClientUseCase(this.clientRepository);
        }
        return this._pushDataClientUseCase;
    }
    // CASOS DE USO: VENTA
    get createSaleWithProductsUseCase() {
        if (!this._createSaleWithProductsUseCase) {
            this._createSaleWithProductsUseCase = new CreateSaleWithProductsUseCase_1.CreateSaleWithProductsUseCase(this.saleRepository, this.saleStatusRepository, this.productRepository);
        }
        return this._createSaleWithProductsUseCase;
    }
    get listSalesWithFiltersUseCase() {
        if (!this._listSalesWithFiltersUseCase) {
            this._listSalesWithFiltersUseCase = new ListSalesWithFiltersUseCase_1.ListSalesWithFiltersUseCase(this.saleRepository);
        }
        return this._listSalesWithFiltersUseCase;
    }
    get addSaleItemUseCase() {
        if (!this._addSaleItemUseCase) {
            this._addSaleItemUseCase = new AddSaleItemUseCase_1.AddSaleItemUseCase(this.saleRepository);
        }
        return this._addSaleItemUseCase;
    }
    get updateSaleItemUseCase() {
        if (!this._updateSaleItemUseCase) {
            this._updateSaleItemUseCase = new UpdateSaleItemUseCase_1.UpdateSaleItemUseCase(this.saleRepository);
        }
        return this._updateSaleItemUseCase;
    }
    get removeSaleItemUseCase() {
        if (!this._removeSaleItemUseCase) {
            this._removeSaleItemUseCase = new RemoveSaleItemUseCase_1.RemoveSaleItemUseCase(this.saleRepository);
        }
        return this._removeSaleItemUseCase;
    }
    get changeSaleStatusUseCase() {
        if (!this._changeSaleStatusUseCase) {
            this._changeSaleStatusUseCase = new ChangeSaleStatusUseCase_1.ChangeSaleStatusUseCase(this.saleRepository, this.saleStatusRepository);
        }
        return this._changeSaleStatusUseCase;
    }
    get updateClientSnapshotUseCase() {
        if (!this._updateClientSnapshotUseCase) {
            this._updateClientSnapshotUseCase = new UpdateClientSnapshotUseCase_1.UpdateClientSnapshotUseCase(this.saleRepository);
        }
        return this._updateClientSnapshotUseCase;
    }
    get getSalesStatsUseCase() {
        if (!this._getSalesStatsUseCase) {
            this._getSalesStatsUseCase = new GetSalesStatsUseCase_1.GetSalesStatsUseCase();
        }
        return this._getSalesStatsUseCase;
    }
    // CASOS DE USO: PRODUCTO
    get createProductUseCase() {
        if (!this._createProductUseCase) {
            this._createProductUseCase = new CreateProductUseCase_1.CreateProductUseCase(this.productRepository);
        }
        return this._createProductUseCase;
    }
    get updateProductUseCase() {
        if (!this._updateProductUseCase) {
            this._updateProductUseCase = new UpdateProductUseCase_1.UpdateProductUseCase(this.productRepository);
        }
        return this._updateProductUseCase;
    }
    get toggleProductActiveUseCase() {
        if (!this._toggleProductActiveUseCase) {
            this._toggleProductActiveUseCase = new ToggleProductActiveUseCase_1.ToggleProductActiveUseCase(this.productRepository);
        }
        return this._toggleProductActiveUseCase;
    }
    get listProductsUseCase() {
        if (!this._listProductsUseCase) {
            this._listProductsUseCase = new ListProductsUseCase_1.ListProductsUseCase(this.productRepository);
        }
        return this._listProductsUseCase;
    }
    get getProductUseCase() {
        if (!this._getProductUseCase) {
            this._getProductUseCase = new GetProductUseCase_1.GetProductUseCase(this.productRepository);
        }
        return this._getProductUseCase;
    }
    // CASOS DE USO: ESTADO DE VENTA
    get createSaleStatusUseCase() {
        if (!this._createSaleStatusUseCase) {
            this._createSaleStatusUseCase = new CreateSaleStatusUseCase_1.CreateSaleStatusUseCase(this.saleStatusRepository);
        }
        return this._createSaleStatusUseCase;
    }
    get updateSaleStatusUseCase() {
        if (!this._updateSaleStatusUseCase) {
            this._updateSaleStatusUseCase = new UpdateSaleStatusUseCase_1.UpdateSaleStatusUseCase(this.saleStatusRepository);
        }
        return this._updateSaleStatusUseCase;
    }
    get listSaleStatusUseCase() {
        if (!this._listSaleStatusUseCase) {
            this._listSaleStatusUseCase = new ListSaleStatusUseCase_1.ListSaleStatusUseCase(this.saleStatusRepository);
        }
        return this._listSaleStatusUseCase;
    }
    get reorderSaleStatusesUseCase() {
        if (!this._reorderSaleStatusesUseCase) {
            this._reorderSaleStatusesUseCase = new ReorderSaleStatusesUseCase_1.ReorderSaleStatusesUseCase(this.saleStatusRepository);
        }
        return this._reorderSaleStatusesUseCase;
    }
    get deleteSaleStatusUseCase() {
        if (!this._deleteSaleStatusUseCase) {
            this._deleteSaleStatusUseCase = new DeleteSaleStatusUseCase_1.DeleteSaleStatusUseCase(this.saleStatusRepository);
        }
        return this._deleteSaleStatusUseCase;
    }
    // REPOSITORIO: RECORDING
    get recordingRepository() {
        if (!this._recordingRepository) {
            this._recordingRepository = new RecordingPrismaRepository_1.RecordingPrismaRepository();
        }
        return this._recordingRepository;
    }
    // CASOS DE USO: RECORDING
    get uploadRecordingUseCase() {
        if (!this._uploadRecordingUseCase) {
            this._uploadRecordingUseCase = new UploadRecordingUseCase_1.UploadRecordingUseCase(this.recordingRepository, this.saleRepository);
        }
        return this._uploadRecordingUseCase;
    }
    get listRecordingsUseCase() {
        if (!this._listRecordingsUseCase) {
            this._listRecordingsUseCase = new ListRecordingsUseCase_1.ListRecordingsUseCase(this.recordingRepository, this.saleRepository);
        }
        return this._listRecordingsUseCase;
    }
    get downloadRecordingUseCase() {
        if (!this._downloadRecordingUseCase) {
            this._downloadRecordingUseCase = new DownloadRecordingUseCase_1.DownloadRecordingUseCase(this.recordingRepository);
        }
        return this._downloadRecordingUseCase;
    }
    get deleteRecordingUseCase() {
        if (!this._deleteRecordingUseCase) {
            this._deleteRecordingUseCase = new DeleteRecordingUseCase_1.DeleteRecordingUseCase(this.recordingRepository, this.saleRepository);
        }
        return this._deleteRecordingUseCase;
    }
    // SERVICIOS EXTERNOS
    get healthChecker() {
        if (!this._healthChecker) {
            this._healthChecker = new HealthChecker_1.HealthChecker(this.userRepository, this.clientRepository, this.saleRepository, this.config.app.version, this.config.app.environment);
            logger_1.default.info('Health checker initialized');
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
    configureEnvironment(newConfig) {
        if (this._config) {
            this._config = { ...this._config, ...newConfig };
            logger_1.default.info('Configuration updated', newConfig);
        }
    }
    reset() {
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
        this._healthChecker = undefined;
        logger_1.default.info('ServiceContainer reset completed');
    }
    resetAll() {
        this.reset();
        this._config = undefined;
        logger_1.default.info('ServiceContainer complete reset (including config)');
    }
}
exports.serviceContainer = ServiceContainer.getInstance();
