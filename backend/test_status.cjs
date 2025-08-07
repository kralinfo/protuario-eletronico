const knex = require('knex')(require('./knexfile.cjs').development);

async function testStatus() {
  try {
    // Verificar todos os status existentes
    const result = await knex.raw(`
      SELECT DISTINCT status, COUNT(*) as quantidade 
      FROM atendimentos 
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('Status existentes na tabela atendimentos:');
    result.rows.forEach(row => {
      console.log(`- "${row.status}": ${row.quantidade} registros`);
    });

    // Verificar atendimentos de hoje
    const hoje = await knex.raw(`
      SELECT id, status, data_hora_atendimento, created_at
      FROM atendimentos 
      WHERE DATE(data_hora_atendimento) = CURRENT_DATE
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\nAtendimentos de hoje:');
    hoje.rows.forEach(row => {
      console.log(`ID: ${row.id}, Status: "${row.status}", Data: ${row.data_hora_atendimento}`);
    });
    
    knex.destroy();
  } catch (error) {
    console.error('Erro:', error);
    knex.destroy();
  }
}

testStatus();
