// src/config/load-env.ts
import dotenv from 'dotenv';
import path from 'path';

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const envFile = path.resolve(
  process.cwd(),
  `.env.${NODE_ENV === 'development' ? 'local' : NODE_ENV}`
);

dotenv.config({ path: envFile });

console.log(`Loaded environment: ${NODE_ENV} → ${envFile}`);
