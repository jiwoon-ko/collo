import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not defined in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initializeDatabase() {
  console.log('Connecting to Neon PostgreSQL Database...');
  const client = await pool.connect();

  try {
    console.log('Connected successfully. Starting migrations...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        points INT DEFAULT 0,
        solved_ids JSONB DEFAULT '[]'::jsonb,
        tactical_mastery JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Users table ready.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        author VARCHAR(50) NOT NULL,
        category VARCHAR(20) DEFAULT 'free',
        likes INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Posts table ready.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        author VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Comments table ready.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_challenges (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        category VARCHAR(50) NOT NULL,
        role VARCHAR(20) NOT NULL,
        level VARCHAR(20) NOT NULL,
        xp INT NOT NULL,
        cwe VARCHAR(30),
        answer TEXT NOT NULL,
        flag VARCHAR(200) NOT NULL,
        "desc" TEXT NOT NULL,
        code TEXT,
        language VARCHAR(30),
        hint TEXT,
        created_by VARCHAR(50) DEFAULT 'Anonymous',
        play_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ AI challenges table ready.');

    console.log('🎉 Database initialization complete!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase();
