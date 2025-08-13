const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function addStatusDestinoField() {
  const client = await pool.connect();

  try {
    console.log('🔍 Verificando se a coluna status_destino existe...');

    // Verificar se a coluna já existe
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      AND column_name = 'status_destino';
    `;

    const result = await client.query(checkColumnQuery);

    if (result.rows.length === 0) {
      console.log('➕ Coluna status_destino não existe. Criando...');

      // Adicionar a coluna status_destino
      const addColumnQuery = `
        ALTER TABLE atendimentos 
        ADD COLUMN status_destino VARCHAR(50);
      `;

      await client.query(addColumnQuery);

      // Adicionar comentário à coluna
      const addCommentQuery = `
        COMMENT ON COLUMN atendimentos.status_destino IS 'Status de destino após a triagem';
      `;

      await client.query(addCommentQuery);

      // Definir valor padrão para registros existentes
      const updateDefaultQuery = `
        UPDATE atendimentos 
        SET status_destino = 'encaminhado para sala médica'
        WHERE status_destino IS NULL 
        AND status IN ('encaminhado para sala médica', 'encaminhado para ambulatório', 'encaminhado para exames');
      `;

      const updateResult = await client.query(updateDefaultQuery);

      console.log('✅ Coluna status_destino criada com sucesso!');
      console.log(`✅ ${updateResult.rowCount} registros atualizados com valor padrão.`);

    } else {
      console.log('✅ Coluna status_destino já existe.');
    }

    // Verificação final
    console.log('🔍 Verificação final...');
    const finalResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      AND column_name = 'status_destino';
    `);

    if (finalResult.rows.length > 0) {
      console.log('✅ Coluna status_destino configurada:', finalResult.rows[0]);
    } else {
      console.log('❌ Erro: Coluna status_destino não foi criada.');
    }

  } catch (error) {
    console.error('❌ Erro ao adicionar coluna status_destino:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  addStatusDestinoField()
    .then(() => {
      console.log('🎉 Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha na execução:', error);
      process.exit(1);
    });
}

module.exports = addStatusDestinoField;
