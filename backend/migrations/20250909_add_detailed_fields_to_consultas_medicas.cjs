/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const colunas = [
    { nome: 'medicamentos_prescritos', tipo: t => t.text('medicamentos_prescritos').nullable().comment('Lista de medicamentos prescritos pelo médico') },
    { nome: 'medicamentos_ambulatorio', tipo: t => t.text('medicamentos_ambulatorio').nullable().comment('Medicamentos para aplicação/administração no ambulatório') },
    { nome: 'atestado_emitido', tipo: t => t.boolean('atestado_emitido').defaultTo(false).comment('Se foi emitido atestado médico') },
    { nome: 'atestado_cid', tipo: t => t.string('atestado_cid', 20).nullable().comment('CID do atestado médico') },
    { nome: 'atestado_detalhes', tipo: t => t.text('atestado_detalhes').nullable().comment('Detalhes e observações do atestado') },
    { nome: 'atestado_dias', tipo: t => t.integer('atestado_dias').nullable().comment('Número de dias do atestado') },
    { nome: 'necessita_observacao', tipo: t => t.boolean('necessita_observacao').defaultTo(false).comment('Se o paciente necessita observação') },
    { nome: 'tempo_observacao_horas', tipo: t => t.integer('tempo_observacao_horas').nullable().comment('Tempo de observação em horas') },
    { nome: 'motivo_observacao', tipo: t => t.text('motivo_observacao').nullable().comment('Motivo da observação') },
    { nome: 'exames_solicitados', tipo: t => t.text('exames_solicitados').nullable().comment('Lista de exames solicitados') },
    { nome: 'orientacoes_paciente', tipo: t => t.text('orientacoes_paciente').nullable().comment('Orientações gerais para o paciente') },
    { nome: 'retorno_agendado', tipo: t => t.boolean('retorno_agendado').defaultTo(false).comment('Se foi agendado retorno') },
    { nome: 'data_retorno', tipo: t => t.date('data_retorno').nullable().comment('Data do retorno agendado') },
    { nome: 'observacoes_retorno', tipo: t => t.text('observacoes_retorno').nullable().comment('Observações sobre o retorno') },
    { nome: 'procedimentos_realizados', tipo: t => t.text('procedimentos_realizados').nullable().comment('Procedimentos médicos realizados durante o atendimento') },
    { nome: 'detalhes_destino', tipo: t => t.text('detalhes_destino').nullable().comment('Detalhes sobre o destino do paciente (alta, transferência, etc.)') },
    { nome: 'alergias_identificadas', tipo: t => t.text('alergias_identificadas').nullable().comment('Alergias identificadas durante o atendimento') },
    { nome: 'historico_familiar_relevante', tipo: t => t.text('historico_familiar_relevante').nullable().comment('Histórico familiar relevante identificado') },
    { nome: 'data_prescricao', tipo: t => t.timestamp('data_prescricao').nullable().comment('Data e hora da prescrição') },
    { nome: 'medico_supervisor_id', tipo: t => t.integer('medico_supervisor_id').nullable().comment('ID do médico supervisor (se aplicável)') }
  ];
  for (const col of colunas) {
    const exists = await knex.schema.hasColumn('consultas_medicas', col.nome);
    if (!exists) {
      await knex.schema.alterTable('consultas_medicas', col.tipo);
      console.log(`✅ Coluna ${col.nome} adicionada à tabela consultas_medicas`);
    } else {
      console.log(`ℹ️  Coluna ${col.nome} já existe - pulando`);
    }
  }

  // Índices para melhor performance (tenta criar, ignora erro se já existe)
  const indices = ['atestado_emitido', 'necessita_observacao', 'retorno_agendado', 'data_retorno'];
  for (const idx of indices) {
    try {
      await knex.schema.alterTable('consultas_medicas', t => t.index(idx));
    } catch (e) {}
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('consultas_medicas', function(table) {
    // Remover campos de medicamentos
    table.dropColumn('medicamentos_prescritos');
    table.dropColumn('medicamentos_ambulatorio');
    
    // Remover campos de atestado
    table.dropColumn('atestado_emitido');
    table.dropColumn('atestado_cid');
    table.dropColumn('atestado_detalhes');
    table.dropColumn('atestado_dias');
    
    // Remover campos de observação
    table.dropColumn('necessita_observacao');
    table.dropColumn('tempo_observacao_horas');
    table.dropColumn('motivo_observacao');
    
    // Remover campos de exames
    table.dropColumn('exames_solicitados');
    table.dropColumn('orientacoes_paciente');
    
    // Remover campos de retorno
    table.dropColumn('retorno_agendado');
    table.dropColumn('data_retorno');
    table.dropColumn('observacoes_retorno');
    
    // Remover outros campos
    table.dropColumn('procedimentos_realizados');
    table.dropColumn('detalhes_destino');
    table.dropColumn('alergias_identificadas');
    table.dropColumn('historico_familiar_relevante');
    table.dropColumn('data_prescricao');
    table.dropColumn('medico_supervisor_id');
  });
};
