import { body, param, query, validationResult } from 'express-validator';

/**
 * Middleware para processar resultados de validação
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Dados inválidos',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Validações para autenticação
 */
export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Email deve ter formato válido')
    .normalizeEmail(),
  body('senha')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres'),
  handleValidationErrors
];

/**
 * Validações para pacientes
 */
export const validatePaciente = [
  body('nome')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Nome deve ter entre 2 e 255 caracteres'),
  body('mae')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Nome da mãe deve ter no máximo 255 caracteres'),
  body('nascimento')
    .optional()
    .isISO8601()
    .withMessage('Data de nascimento deve estar no formato YYYY-MM-DD'),
  body('sexo')
    .optional()
    .isIn(['M', 'F', 'I'])
    .withMessage('Sexo deve ser M, F ou I'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email deve ter formato válido')
    .normalizeEmail(),
  body('telefone')
    .optional()
    .matches(/^[\d\s\-\(\)]+$/)
    .withMessage('Telefone deve conter apenas números, espaços, hífens e parênteses'),
  body('cep')
    .optional()
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage('CEP deve estar no formato 12345-678'),
  body('uf')
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage('UF deve ter 2 caracteres'),
  body('sus')
    .optional()
    .matches(/^\d{0,20}$/)
    .withMessage('Cartão SUS deve conter até 20 dígitos'),
  handleValidationErrors
];

/**
 * Validações para atualização de paciente
 */
export const validatePacienteUpdate = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID deve ser um número inteiro positivo'),
  ...validatePaciente
];

/**
 * Validações para relatórios
 */
export const validateRelatorio = [
  query('dataInicio')
    .optional()
    .isISO8601()
    .withMessage('Data de início deve estar no formato YYYY-MM-DD'),
  query('dataFim')
    .optional()
    .isISO8601()
    .withMessage('Data de fim deve estar no formato YYYY-MM-DD'),
  query('sexo')
    .optional()
    .isIn(['M', 'F', 'I'])
    .withMessage('Sexo deve ser M, F ou I'),
  query('procedencia')
    .optional()
    .isIn(['Emergência', 'Ambulatorial', 'Internação'])
    .withMessage('Procedência deve ser: Emergência, Ambulatorial ou Internação'),
  query('ordenacao')
    .optional()
    .isIn(['nome', 'created_at', 'nascimento', 'idade'])
    .withMessage('Ordenação deve ser: nome, created_at, nascimento ou idade'),
  handleValidationErrors
];

/**
 * Validação para IDs de parâmetros
 */
export const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID deve ser um número inteiro positivo'),
  handleValidationErrors
];

/**
 * Sanitização de dados de entrada
 */
export const sanitizeInput = (req, res, next) => {
  // Remove propriedades perigosas
  const dangerousFields = ['__proto__', 'constructor', 'prototype'];
  
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    dangerousFields.forEach(field => {
      delete obj[field];
    });
    
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      } else if (typeof obj[key] === 'string') {
        // Remove scripts básicos
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      }
    });
    
    return obj;
  };
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};
