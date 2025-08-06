const { Pool } = require('../backend/node_modules/pg');
const bcrypt = require('../backend/node_modules/bcrypt');

// Configuração do banco (mesmo do backend)
const pool = new Pool({
  connectionString: 'postgresql://mydb_l01f_user:9SMTVGi0Sb1QgSesdVxAmGZuCXnMEtKJ@dpg-d1jjelemcj7s739u1vjg-a.oregon-postgres.render.com:5432/mydb_l01f',
  ssl: {
    rejectUnauthorized: false
  }
});

async function criarUsuarioTeste() {
  try {
    console.log('🔗 Conectando ao banco...');
    
    // Verificar se a tabela usuarios existe
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      );
    `);
    
    if (!checkTable.rows[0].exists) {
      console.log('📋 Criando tabela usuarios...');
      await pool.query(`
        CREATE TABLE usuarios (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          senha VARCHAR(255) NOT NULL,
          nome VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Tabela usuarios criada!');
    } else {
      console.log('✅ Tabela usuarios já existe!');
    }

    // Verificar se já existe um usuário teste
    const existingUser = await pool.query('SELECT * FROM usuarios WHERE email = $1', ['admin@teste.com']);
    
    if (existingUser.rows.length > 0) {
      console.log('⚠️ Usuário teste já existe!');
      console.log('📧 Email: admin@teste.com');
      console.log('🔑 Senha: 123456');
      return;
    }

    // Criar senha hash
    const senhaHash = await bcrypt.hash('123456', 10);
    
    // Inserir usuário teste
    const result = await pool.query(
      'INSERT INTO usuarios (email, senha, nome) VALUES ($1, $2, $3) RETURNING *',
      ['admin@teste.com', senhaHash, 'Administrador Teste']
    );
    
    console.log('🎉 Usuário teste criado com sucesso!');
    console.log('📧 Email: admin@teste.com');
    console.log('🔑 Senha: 123456');
    console.log('👤 Nome:', result.rows[0].nome);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
    console.log('🔚 Conexão encerrada');
  }
}

criarUsuarioTeste();
