/**
 * Migration: 001_create_initial_tables
 * Data: 2025-08-03
 * Descrição: Criação das tabelas iniciais do sistema
 */

export async function up(knex) {
  // Tabela de usuários
  await knex.schema.createTable('usuarios', function(table) {
    table.increments('id').primary();
    table.string('nome', 255).notNullable();
    table.string('email', 255).unique().notNullable();
    table.string('senha', 255).notNullable();
    table.string('nivel', 50).defaultTo('visualizador').checkIn(['admin', 'editor', 'visualizador']);
    table.specificType('modulos', 'TEXT[]'); // Array de módulos de acesso
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Tabela de pacientes
  await knex.schema.createTable('pacientes', function(table) {
    table.increments('id').primary();
    table.string('nome', 255).notNullable();
    table.string('mae', 255).notNullable();
    table.date('nascimento').notNullable();
    table.string('sexo', 1).checkIn(['M', 'F', 'I']);
    table.string('estado_civil', 50);
    table.string('profissao', 255);
    table.string('escolaridade', 255);
    table.string('raca', 50);
    table.string('endereco', 500).notNullable();
    table.string('bairro', 255).notNullable();
    table.string('municipio', 255).notNullable();
    table.string('uf', 2).notNullable();
    table.string('cep', 10).notNullable();
    table.string('telefone', 15);
    table.string('sus', 15);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Tabela de atendimentos
  await knex.schema.createTable('atendimentos', function(table) {
    table.increments('id').primary();
    table.integer('paciente_id').unsigned().notNullable().references('id').inTable('pacientes').onDelete('CASCADE');
    table.text('motivo').notNullable();
    table.string('status', 50).defaultTo('recepcao').checkIn(['recepcao', 'triagem', 'atendimento', 'finalizado', 'interrompido']);
    table.text('motivo_interrupcao').defaultTo('N/A');
    table.text('observacoes');
    table.string('acompanhante', 255);
    table.string('procedencia', 255);
    table.timestamp('data_hora_atendimento').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Índices para performance
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_pacientes_nome ON pacientes(nome)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_pacientes_nascimento ON pacientes(nascimento)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_pacientes_sus ON pacientes(sus)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_atendimentos_paciente_id ON atendimentos(paciente_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_atendimentos_data ON atendimentos(data_hora_atendimento)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_atendimentos_status ON atendimentos(status)');

  // Triggers para updated_at
  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await knex.schema.raw('CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
  await knex.schema.raw('CREATE TRIGGER update_pacientes_updated_at BEFORE UPDATE ON pacientes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
  await knex.schema.raw('CREATE TRIGGER update_atendimentos_updated_at BEFORE UPDATE ON atendimentos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
}

export async function down(knex) {
  // Remover triggers
  await knex.schema.raw('DROP TRIGGER IF EXISTS update_atendimentos_updated_at ON atendimentos');
  await knex.schema.raw('DROP TRIGGER IF EXISTS update_pacientes_updated_at ON pacientes');
  await knex.schema.raw('DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios');
  await knex.schema.raw('DROP FUNCTION IF EXISTS update_updated_at_column()');
  
  // Remover tabelas (ordem inversa devido às foreign keys)
  await knex.schema.dropTableIfExists('atendimentos');
  await knex.schema.dropTableIfExists('pacientes');
  await knex.schema.dropTableIfExists('usuarios');
}
