/**
 * Middleware de verificação de campos obrigatórios
 * Verifica se os campos críticos existem antes de processar qualquer request
 */

import { Client } from 'pg';

let fieldsVerified = false;
let verificationPromise = null;

export async function verifyAbandonoFields() {
  if (fieldsVerified) {
    return true;
  }
  
  if (verificationPromise) {
    return verificationPromise;
  }
  
  verificationPromise = performVerification();
  return verificationPromise;
}

async function performVerification() {
  console.log('🔍 VERIFICANDO CAMPOS DE ABANDONO...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    await client.connect();
    console.log('✅ Conectado para verificação');
    
    // Verificar se as colunas existem
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      AND column_name IN ('abandonado', 'data_abandono', 'motivo_abandono', 'usuario_abandono_id', 'etapa_abandono')
    `);
    
    const existingColumns = result.rows.map(r => r.column_name);
    console.log(`📋 Colunas encontradas: [${existingColumns.join(', ')}]`);
    
    if (existingColumns.length < 5) {
      console.log('🔧 Criando campos faltantes...');
      
      const sqlCommands = [
        'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS abandonado BOOLEAN DEFAULT false',
        'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS data_abandono TIMESTAMP',
        'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS motivo_abandono VARCHAR(500)',
        'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS usuario_abandono_id INTEGER',
        'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS etapa_abandono VARCHAR(50)'
      ];
      
      for (const sql of sqlCommands) {
        try {
          await client.query(sql);
          console.log(`✅ Executado: ${sql.substring(0, 50)}...`);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.error(`❌ Erro: ${error.message}`);
          }
        }
      }
      
      // Verificar novamente
      const finalResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'atendimentos' 
        AND column_name IN ('abandonado', 'data_abandono', 'motivo_abandono', 'usuario_abandono_id', 'etapa_abandono')
      `);
      
      if (finalResult.rows.length === 5) {
        console.log('✅ Todos os campos criados com sucesso!');
        fieldsVerified = true;
        return true;
      } else {
        console.error(`❌ Falha: apenas ${finalResult.rows.length}/5 campos criados`);
        return false;
      }
    } else {
      console.log('✅ Todos os campos já existem');
      fieldsVerified = true;
      return true;
    }
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

// Middleware para Express
export function ensureAbandonoFieldsMiddleware(req, res, next) {
  verifyAbandonoFields()
    .then(success => {
      if (success) {
        next();
      } else {
        res.status(500).json({
          error: 'Campos críticos do banco de dados não estão disponíveis',
          message: 'Os campos de abandono não foram criados no banco. Contacte o administrador.'
        });
      }
    })
    .catch(error => {
      console.error('💥 Erro no middleware de verificação:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Falha na verificação dos campos do banco de dados'
      });
    });
}
