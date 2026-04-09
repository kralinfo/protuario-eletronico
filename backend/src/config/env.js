import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Servidor
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  
  // Email
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT || 587,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM,
  
  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:4200',
  
  // Segurança
  BCRYPT_ROUNDS: 10,
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutos
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Upload
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '5mb',
  
  // Logs
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

export default config;
