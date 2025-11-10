"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    user: process.env.POSTGRES_USER || 'simri_user',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'simri',
    password: process.env.POSTGRES_PASSWORD || 'simri_password',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
});
exports.default = pool;
//# sourceMappingURL=database.js.map