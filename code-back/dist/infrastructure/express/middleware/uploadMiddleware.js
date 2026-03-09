"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_SIZE = exports.ALLOWED_MIMES = exports.RECORDS_DIR = exports.uploadRecording = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const RECORDS_DIR = process.env.RECORDS_PATH || './records';
exports.RECORDS_DIR = RECORDS_DIR;
const ALLOWED_MIMES = [
    'audio/mpeg', // .mp3
    'audio/wav', // .wav
    'audio/ogg', // .ogg
    'audio/webm', // .webm audio
    'audio/x-m4a', // .m4a
    'video/mp4', // .mp4
    'video/webm', // .webm video
    'video/ogg', // .ogv
];
exports.ALLOWED_MIMES = ALLOWED_MIMES;
const MAX_SIZE = parseInt(process.env.MAX_RECORDING_SIZE || '104857600'); // 100MB default
exports.MAX_SIZE = MAX_SIZE;
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const saleId = req.params.saleId;
        if (!saleId) {
            return cb(new Error('saleId es requerido'), '');
        }
        const dir = path_1.default.join(RECORDS_DIR, saleId);
        fs_1.default.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const uniqueName = `${(0, uuid_1.v4)()}${ext}`;
        cb(null, uniqueName);
    },
});
const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Tipos permitidos: audio/video`));
    }
};
exports.uploadRecording = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_SIZE,
    },
});
