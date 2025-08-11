// Script final para sincronizar banco de produção
const knex = require('knex');

// Configuração baseada no seu knexfile.cjs
const db = knex({
  client: 'postgresql',
  connection: 'postgresql://mydb_l01f_user:9SMTVGi0Sb1QgSesdVxAmGZuCXnMEtKJ@dpg-d1jjelemcj7s739u1vjg-a.oregon-postgres.render.com/mydb_l01f?sslmode=require',
  ssl: { rejectUnauthorized: false },
  acquireConnectionTimeout: 60000
});

async function syncProduction() {
  console.log('🚀 Iniciando sincronização do banco de produção...');
  
  try {
    // Verificar colunas existentes
    const result = await db.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      ORDER BY ordinal_position
    `);
    
    const existingColumns = result.rows.map(r => r.column_name);
    console.log('📋 Colunas existentes:', existingColumns.length);
    
    // Colunas necessárias para triagem
    const neededColumns = [
      'classificacao_risco',
      'prioridade', 
      'status_destino',
      'queixa_principal',
      'historia_atual',
      'pressao_arterial',
      'temperatura',
      'frequencia_cardiaca',
      'frequencia_respiratoria',
      'saturacao_oxigenio',
      'peso',
      'altura',
      'alergias',
      'medicamentos_uso',
      'observacoes_triagem',
      'triagem_realizada_por',
      'data_inicio_triagem',
      'data_fim_triagem'
    ];
    
    const missingColumns = neededColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('✅ Todas as colunas já existem!');
      return;
    }
    
    console.log('🔧 Adicionando', missingColumns.length, 'colunas faltantes...');
    
    // Adicionar colunas SQL direto
    const alterStatements = [
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS classificacao_risco VARCHAR(50)`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS prioridade INTEGER`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS status_destino VARCHAR(100)`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS queixa_principal TEXT`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS historia_atual TEXT`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS pressao_arterial VARCHAR(20)`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS temperatura DECIMAL(4,2)`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS frequencia_cardiaca INTEGER`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS frequencia_respiratoria INTEGER`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS saturacao_oxigenio INTEGER`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS peso DECIMAL(6,2)`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS altura DECIMAL(5,2)`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS alergias TEXT`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS medicamentos_uso TEXT`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS observacoes_triagem TEXT`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS triagem_realizada_por INTEGER`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS data_inicio_triagem TIMESTAMP WITH TIME ZONE`,
      `ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS data_fim_triagem TIMESTAMP WITH TIME ZONE`
    ];
    
    for (const sql of alterStatements) {
      try {
        await db.raw(sql);
        const colName = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)[1];
        console.log('✅ Adicionada:', colName);
      } catch (err) {
        console.log('⚠️ ', err.message);
      }
    }
    
    console.log('🎉 Sincronização concluída!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await db.destroy();
  }
}

syncProduction();
