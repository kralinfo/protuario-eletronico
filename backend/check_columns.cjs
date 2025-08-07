const knex = require('knex')(require('./knexfile.cjs').development);

async function checkColumns() {
  try {
    const result = await knex.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      ORDER BY column_name
    `);
    
    console.log('Colunas existentes na tabela atendimentos:');
    result.rows.forEach(row => {
      console.log('- ' + row.column_name);
    });
    
    knex.destroy();
  } catch (error) {
    console.error('Erro:', error);
    knex.destroy();
  }
}

checkColumns();
