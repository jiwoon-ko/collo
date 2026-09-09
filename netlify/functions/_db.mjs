import pg from 'pg';

const { Pool } = pg;

export const getPool = () => new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

export const corsHeaders = (methods) => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': `${methods}, OPTIONS`,
  'Content-Type': 'application/json',
});
