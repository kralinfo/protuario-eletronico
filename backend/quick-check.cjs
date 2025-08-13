const knex = require('knex');

const db = knex({
  client: 'postgresql',
  connection: {
    connectionString: 'postgresql://mydb_l01f_user:9SMTVGi0Sb1QgSesdVxAmGZuCXnMEtKJ@dpg-d1jjelemcj7s739u1vjg-a.oregon-postgres.render.com/mydb_l01f',
    ssl: { rejectUnauthorized: false }
  }
});

console.log('Conectando...');
db.raw('SELECT column_name FROM information_schema.columns WHERE table_name = ? ORDER BY ordinal_position', ['atendimentos'])
  .then(result => {
    console.log('Colunas existentes:');
    result.rows.forEach(row => console.log('  -', row.column_name));
    
    const needed = ['classificacao_risco', 'prioridade', 'status_destino', 'queixa_principal'];
    const existing = result.rows.map(r => r.column_name);
    const missing = needed.filter(col => !existing.includes(col));
    
    if (missing.length === 0) {
      console.log('✅ Todas as colunas necessárias já existem!');
    } else {
      console.log('❌ Colunas faltantes:', missing);
    }
    
    return db.destroy();
  })
  .catch(err => {
    console.error('Erro:', err.message);
    process.exit(1);
  });
