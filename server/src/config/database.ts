import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'simri_user',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'simri',
  password: process.env.POSTGRES_PASSWORD || 'simri_password',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

export default pool;