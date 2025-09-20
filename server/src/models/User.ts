import pool from '../config/database';
import { User } from '../types';

export class UserModel {
  static async findById(id: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  static async findByGoogleId(googleId: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    return result.rows[0] || null;
  }

  static async create(userData: Partial<User>): Promise<User> {
    const { google_id, email, name, avatar_url, role = 'customer', is_verified = false } = userData;
    
    const result = await pool.query(`
      INSERT INTO users (google_id, email, name, avatar_url, role, is_verified) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `, [google_id, email, name, avatar_url, role, is_verified]);
    
    return result.rows[0];
  }

  static async update(id: string, userData: Partial<User>): Promise<User | null> {
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
    
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }
}