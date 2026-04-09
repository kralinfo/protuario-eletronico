/**
 * Serviço de criptografia para proteção de dados sensíveis em repouso.
 * Usa AES-256-GCM para criptografia simétrica com autenticação.
 *
 * LGPD Art. 46: Medidas de seguranca tecnicas para protecao de dados pessoais.
 *
 * A chave de criptografia deve ser fornecida via variavel de ambiente
 * ENCRYPTION_KEY (hex, 64 caracteres = 32 bytes para AES-256).
 */

import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';

// Cache da chave para evitar re-calculo
let _encryptionKey = null;
let _keyInitialized = false;

function getEncryptionKey() {
  if (_keyInitialized) return _encryptionKey;

  const keySource = process.env.ENCRYPTION_KEY;

  if (!keySource) {
    // Modo development: gera chave aleatoria (dados nao persistem entre reinicios)
    // WARNING: Em producao, defina ENCRYPTION_KEY no painel do Render!
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ ENCRYPTION_KEY nao configurada. Gerando chave aleatoria para development.');
      console.warn('   Dados criptografados NAO poderao ser descriptografados apos reinicio.');
      console.warn('   Configure ENCRYPTION_KEY no .env ou painel do Render para persistencia.');
      _encryptionKey = randomBytes(32);
      _keyInitialized = true;
      return _encryptionKey;
    }

    throw new Error(
      'ENCRYPTION_KEY nao configurada em producao. ' +
      'Configure uma chave hexadecimal de 64 caracteres (32 bytes) no painel do Render. ' +
      'Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Validar formato da chave
  if (!/^[a-fA-F0-9]{64}$/.test(keySource)) {
    throw new Error(
      'ENCRYPTION_KEY invalida. Deve ser uma string hexadecimal de 64 caracteres (32 bytes). ' +
      'Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  _encryptionKey = Buffer.from(keySource, 'hex');
  _keyInitialized = true;
  return _encryptionKey;
}

// Algoritmo e configuracao
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes para AES
const AUTH_TAG_LENGTH = 16; // 16 bytes para GCM auth tag

/**
 * Criptografa um valor de texto.
 * Formato de saida: iv(32hex):encrypted(hex):authTag(32hex)
 *
 * @param {string} plaintext - Texto a ser criptografado
 * @returns {string|null} - Texto criptografado ou null se input for vazio
 */
export function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return null;
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Formato: iv:encrypted:authTag
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * Descriptografa um valor previamente criptografado.
 *
 * @param {string} encryptedData - Dados no formato iv:encrypted:authTag
 * @returns {string|null} - Texto original ou null se input for vazio
 */
export function decrypt(encryptedData) {
  if (encryptedData === null || encryptedData === undefined || encryptedData === '') {
    return null;
  }

  // Se nao parece estar criptografado (sem separadores), retorna como esta
  if (!encryptedData.includes(':')) {
    return encryptedData;
  }

  const key = getEncryptionKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    // Dado possivelmente nao criptografado ou corrompido
    console.warn('⚠️ Dados criptografados com formato invalido:', encryptedData.substring(0, 20) + '...');
    return encryptedData;
  }

  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // Se falhar, provavelmente chave errada ou dado corrompido
    console.error('❌ Falha ao descriptografar dado:', error.message);
    throw new Error('Falha ao descriptografar dados. Verifique se a ENCRYPTION_KEY esta correta.');
  }
}

/**
 * Gera uma nova chave de criptografia em formato hexadecimal.
 * Use para configurar ENCRYPTION_KEY no ambiente.
 *
 * node -e "import('./src/config/encryption.js').then(m => console.log(m.generateKey()))"
 */
export function generateKey() {
  return randomBytes(32).toString('hex');
}

/**
 * Lista de campos sensiveis que devem ser criptografados.
 * Centralizado para facil manutencao.
 */
export const SENSITIVE_FIELDS = {
  // Paciente
  paciente: [
    'sus',           // Cartao SUS (identificador unico)
    'telefone',      // Telefone
    'cep',           // CEP
    'endereco',      // Endereco
    'bairro',        // Bairro
    'municipio',     // Municipio
    'mae',           // Nome da mae (identificador pessoal)
  ],
  // Usuario
  usuario: [
    'email',         // Email do usuario
  ],
  // Atendimento (campos sensiveis)
  atendimento: [
    'acompanhante',  // Nome do acompanhante
  ]
};

/**
 * Criptografa campos sensiveis de um objeto.
 *
 * @param {Object} data - Objeto com dados
 * @param {string[]} fields - Lista de campos a criptografar
 * @returns {Object} - Objeto com campos criptografados
 */
export function encryptFields(data, fields) {
  if (!data || !fields) return data;

  const result = { ...data };
  fields.forEach(field => {
    if (result[field] !== undefined && result[field] !== null && result[field] !== '') {
      result[field] = encrypt(result[field]);
    }
  });
  return result;
}

/**
 * Descriptografa campos sensiveis de um objeto.
 *
 * @param {Object} data - Objeto com dados criptografados
 * @param {string[]} fields - Lista de campos a descriptografar
 * @returns {Object} - Objeto com campos descriptografados
 */
export function decryptFields(data, fields) {
  if (!data || !fields) return data;

  const result = { ...data };
  fields.forEach(field => {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = decrypt(result[field]);
    }
  });
  return result;
}
