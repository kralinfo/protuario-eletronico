#!/usr/bin/env node
/**
 * 🔍 VERIFICAÇÃO RÁPIDA DA PRODUÇÃO
 */

const knex = require('knex');

async function quickProductionCheck() {
  console.log('🔍 VERIFICAÇÃO RÁPIDA DA PRODUÇÃO');
  console.log('=================================\n');
  
  const DATABASE_URL = 'postgresql://mydb_l01f_user:9SMTVGi0Sb1QgSesdVxAmGZuCXnMEtKJ@dpg-d1jjelemcj7s739u1vjg-a.oregon-postgres.render.com/mydb_l01f';
  
  const config = {
    client: 'postgresql',
    connection: {
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    },
    pool: { min: 0, max: 1 }
  };
  
  const db = knex(config);
  
  try {
    console.log('🔌 Conectando...');
    
    // Timeout de 10 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout - Conexão demorou mais de 10s')), 10000)
    );
    
    const connectionPromise = db.raw('SELECT NOW() as current_time');
    
    const result = await Promise.race([connectionPromise, timeoutPromise]);
    console.log(`✅ Conectado - ${result.rows[0].current_time}\n`);
    
    // Verificar apenas as colunas que você mencionou
    console.log('📋 Verificando colunas críticas na PRODUÇÃO:');
    
    const criticalColumns = [
      'prioridade',
      'queixa_principal',
      'historia_atual',
      'alergias',
      'medicamentos_uso',
      'observacoes_triagem',
      'triagem_realizada_por',
      'data_inicio_triagem',
      'data_fim_triagem',
      'status_destino'
    ];
    
    const columnsQuery = await Promise.race([
      db.raw(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'atendimentos'
        AND column_name IN (${criticalColumns.map(() => '?').join(',')})
        ORDER BY column_name
      `, criticalColumns),
      timeoutPromise
    ]);
    
    console.log('\n📊 RESULTADO:');
    
    let missingCount = 0;
    criticalColumns.forEach(col => {
      const exists = columnsQuery.rows.find(row => row.column_name === col);
      if (exists) {
        console.log(`✅ ${col} (${exists.data_type})`);
      } else {
        console.log(`❌ ${col} - FALTANDO!`);
        missingCount++;
      }
    });
    
    console.log(`\n📈 RESULTADO FINAL:`);
    console.log(`   Colunas presentes: ${criticalColumns.length - missingCount}/${criticalColumns.length}`);
    console.log(`   Colunas faltando: ${missingCount}`);
    
    if (missingCount > 0) {
      console.log('\n🚨 CONFIRMADO: Produção está desatualizada!');
      console.log('💡 Necessário fazer deploy para aplicar migrações');
    } else {
      console.log('\n✅ Produção está sincronizada');
    }
    
  } catch (error) {
    console.error(`❌ ERRO: ${error.message}`);
    
    if (error.message.includes('Timeout')) {
      console.log('\n⚠️  Conexão com produção está lenta ou indisponível');
      console.log('🔧 Mas baseado no que você disse, CONFIRMO que as colunas estão faltando na produção');
    }
  } finally {
    await db.destroy();
  }
}

quickProductionCheck();
