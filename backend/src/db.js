// Knex.js conexão para PostgreSQL
import knex from 'knex';

const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('render.com');
const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: isProduction ? { rejectUnauthorized: false } : false
      }
    : {
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'prontuario',
        ssl: false
      }
});

export default db;
