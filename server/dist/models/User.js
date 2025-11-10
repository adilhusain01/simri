"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class UserModel {
    static async findById(id) {
        const result = await database_1.default.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    static async findByEmail(email) {
        const result = await database_1.default.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0] || null;
    }
    static async findByGoogleId(googleId) {
        const result = await database_1.default.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
        return result.rows[0] || null;
    }
    static async create(userData) {
        const { google_id, email, name, avatar_url, role = 'customer', is_verified = false } = userData;
        const result = await database_1.default.query(`
      INSERT INTO users (google_id, email, name, avatar_url, role, is_verified) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `, [google_id, email, name, avatar_url, role, is_verified]);
        return result.rows[0];
    }
    static async update(id, userData) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        for (const [key, value] of Object.entries(userData)) {
            if (value !== undefined && key !== 'id') {
                fields.push(`${key} = $${paramCount++}`);
                values.push(value);
            }
        }
        if (fields.length === 0) {
            return this.findById(id);
        }
        values.push(id);
        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        const result = await database_1.default.query(query, values);
        return result.rows[0] || null;
    }
    static async delete(id) {
        const result = await database_1.default.query('DELETE FROM users WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
}
exports.UserModel = UserModel;
//# sourceMappingURL=User.js.map