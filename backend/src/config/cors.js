import config from './env.js';

// Configuração CORS mais flexível para Vercel
const allowedOrigins = [
  'http://localhost:4200',
  'https://prontuario-eletronico-five.vercel.app',
  /^https:\/\/prontuario-eletronico.*\.vercel\.app$/,
  /^https:\/\/protuario-eletronico.*\.vercel\.app$/
];

export const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (ex: aplicações mobile, Postman)
    if (!origin) return callback(null, true);
    
    // Verificar se origin está na lista permitida ou corresponde ao padrão Vercel
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('🚫 Origin bloqueada pelo CORS:', origin);
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'x-dev-bypass'
  ],
  credentials: true,
  maxAge: 86400 // Cache preflight por 24 horas
};

export default corsOptions;
