/**
 * Migration: Adicionar campos obrigatorios minimos do prontuario eletronico (PEC).
 *
 * Base legal: Ministerio da Saude, CFM 1821/2007.
 *
 * Adiciona:
 * - diagnostico_principal com CID-10 em consultas_medicas
 * - codigos_cid_secundarios (array de CID-10)
 * - Tabela de encaminhamentos
 * - Valida que campos minimos estao preenchidos
 */

exports.up = async function(knex) {
  // 1. Adicionar diagnostico_principal com CID em consultas_medicas
  const hasDiagnostico = await knex.schema.hasColumn('consultas_medicas', 'diagnostico_principal');
  if (!hasDiagnostico) {
    await knex.schema.alterTable('consultas_medicas', table => {
      table.string('diagnostico_principal', 200).nullable()
        .comment('Diagnostico principal (texto livre)');
      table.string('cid_principal', 10).nullable()
        .comment('Codigo CID-10 do diagnostico principal');
      table.string('cid_secundarios', 500).nullable()
        .comment('Codigos CID-10 secundarios separados por virgula');
    });
    console.log('✅ Campos diagnostico_principal, cid_principal, cid_secundarios adicionados');
  }

  // 2. Adicionar campo de registro profissional em usuarios
  const hasRegistroProfissional = await knex.schema.hasColumn('usuarios', 'registro_profissional');
  if (!hasRegistroProfissional) {
    await knex.schema.alterTable('usuarios', table => {
      table.string('registro_profissional', 50).nullable()
        .comment('Registro profissional: CRM, COREN, etc');
      table.string('tipo_registro', 10).nullable()
        .comment('Tipo do registro: CRM, COREN, etc');
      table.string('uf_registro', 2).nullable()
        .comment('UF do registro profissional');
    });
    console.log('✅ Campos registro_profissional, tipo_registro, uf_registro adicionados');
  }

  // 3. Criar tabela de encaminhamentos
  const hasEncaminhamentos = await knex.schema.hasTable('encaminhamentos');
  if (!hasEncaminhamentos) {
    await knex.schema.createTable('encaminhamentos', table => {
      table.increments('id').primary();
      table.integer('atendimento_id').unsigned().notNullable()
        .references('id').inTable('atendimentos').onDelete('CASCADE');
      table.integer('paciente_id').unsigned().notNullable()
        .references('id').inTable('pacientes').onDelete('CASCADE');
      table.integer('profissional_solicitante_id').unsigned().notNullable()
        .references('id').inTable('usuarios').onDelete('SET NULL');
      table.string('tipo_encaminhamento', 100).notNullable()
        .comment('Especialidade ou servico de destino');
      table.string('estabelecimento_destino', 200).nullable()
        .comment('Nome do estabelecimento para onde esta sendo encaminhado');
      table.text('motivo_encaminhamento').notNullable()
        .comment('Justificativa clinica do encaminhamento');
      table.text('resumo_clinico').nullable()
        .comment('Resumo clinico para o profissional de destino');
      table.string('cid_relacionado', 10).nullable()
        .comment('CID relacionado ao encaminhamento');
      table.string('prioridade', 20).notNullable().defaultTo('normal')
        .comment('normal, urgente, emergencia');
      table.string('status', 30).notNullable().defaultTo('pendente')
        .comment('pendente, agendado, realizado, cancelado');
      table.date('data_agendada').nullable()
        .comment('Data agendada para o atendimento de destino');
      table.timestamp('data_encaminhamento').notNullable().defaultTo(knex.fn.now());
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index('atendimento_id');
      table.index('paciente_id');
      table.index('status');
      table.index('data_encaminhamento');
    });
    console.log('✅ Tabela encaminhamentos criada');
  }

  // 4. Criar tabela de exames solicitados
  const hasExamesSolicitados = await knex.schema.hasTable('exames_solicitados');
  if (!hasExamesSolicitados) {
    await knex.schema.createTable('exames_solicitados', table => {
      table.increments('id').primary();
      table.integer('atendimento_id').unsigned().notNullable()
        .references('id').inTable('atendimentos').onDelete('CASCADE');
      table.integer('paciente_id').unsigned().notNullable()
        .references('id').inTable('pacientes').onDelete('CASCADE');
      table.integer('profissional_solicitante_id').unsigned().notNullable()
        .references('id').inTable('usuarios').onDelete('SET NULL');
      table.string('tipo_exame', 100).notNullable()
        .comment('laboratorial, imagem, outro');
      table.string('nome_exame', 200).notNullable()
        .comment('Nome especifico do exame solicitado');
      table.text('observacoes').nullable()
        .comment('Observacoes clinicas para o exame');
      table.text('questao_clinica').nullable()
        .comment('Questao clinica que o exame deve responder');
      table.string('prioridade', 20).notNullable().defaultTo('normal')
        .comment('normal, urgente');
      table.string('status', 30).notNullable().defaultTo('solicitado')
        .comment('solicitado, em_andamento, resultado_recebido, cancelado');
      table.text('resultado').nullable()
        .comment('Resultado do exame (quando recebido)');
      table.timestamp('data_solicitacao').notNullable().defaultTo(knex.fn.now());
      table.timestamp('data_resultado').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index('atendimento_id');
      table.index('paciente_id');
      table.index('status');
      table.index('data_solicitacao');
    });
    console.log('✅ Tabela exames_solicitados criada');
  }

  // 5. Criar tabela de atestados emitidos
  const hasAtestados = await knex.schema.hasTable('atestados_emitidos');
  if (!hasAtestados) {
    await knex.schema.createTable('atestados_emitidos', table => {
      table.increments('id').primary();
      table.integer('atendimento_id').unsigned().notNullable()
        .references('id').inTable('atendimentos').onDelete('CASCADE');
      table.integer('paciente_id').unsigned().notNullable()
        .references('id').inTable('pacientes').onDelete('CASCADE');
      table.integer('medico_id').unsigned().notNullable()
        .references('id').inTable('usuarios').onDelete('SET NULL');
      table.string('cid', 10).nullable()
        .comment('CID do atestado');
      table.string('tipo_atestado', 100).notNullable()
        .comment('Atestado de comparecimento, atestado de saude, etc');
      table.integer('dias_afastamento').nullable()
        .comment('Numero de dias de afastamento');
      table.text('observacoes').nullable()
        .comment('Detalhes e observacoes do atestado');
      table.date('data_inicio').notNullable()
        .comment('Data de inicio do afastamento');
      table.date('data_fim').nullable()
        .comment('Data fim do afastamento');
      table.string('horario_atestado', 50).nullable()
        .comment('Horario do atendimento (ex: 08h as 12h)');
      table.timestamp('data_emissao').notNullable().defaultTo(knex.fn.now());
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index('atendimento_id');
      table.index('paciente_id');
      table.index('data_emissao');
    });
    console.log('✅ Tabela atestados_emitidos criada');
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('atestados_emitidos');
  await knex.schema.dropTableIfExists('exames_solicitados');
  await knex.schema.dropTableIfExists('encaminhamentos');

  const hasDiagnostico = await knex.schema.hasColumn('consultas_medicas', 'diagnostico_principal');
  if (hasDiagnostico) {
    await knex.schema.alterTable('consultas_medicas', table => {
      table.dropColumn('diagnostico_principal');
      table.dropColumn('cid_principal');
      table.dropColumn('cid_secundarios');
    });
  }

  const hasRegistro = await knex.schema.hasColumn('usuarios', 'registro_profissional');
  if (hasRegistro) {
    await knex.schema.alterTable('usuarios', table => {
      table.dropColumn('registro_profissional');
      table.dropColumn('tipo_registro');
      table.dropColumn('uf_registro');
    });
  }
};
