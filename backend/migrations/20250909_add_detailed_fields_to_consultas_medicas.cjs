/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('consultas_medicas', function(table) {
    // Medicamentos prescritos
    table.text('medicamentos_prescritos').nullable().comment('Lista de medicamentos prescritos pelo médico');
    table.text('medicamentos_ambulatorio').nullable().comment('Medicamentos para aplicação/administração no ambulatório');
    
    // Atestado médico
    table.boolean('atestado_emitido').defaultTo(false).comment('Se foi emitido atestado médico');
    table.string('atestado_cid', 20).nullable().comment('CID do atestado médico');
    table.text('atestado_detalhes').nullable().comment('Detalhes e observações do atestado');
    table.integer('atestado_dias').nullable().comment('Número de dias do atestado');
    
    // Observação e internação
    table.boolean('necessita_observacao').defaultTo(false).comment('Se o paciente necessita observação');
    table.integer('tempo_observacao_horas').nullable().comment('Tempo de observação em horas');
    table.text('motivo_observacao').nullable().comment('Motivo da observação');
    
    // Exames solicitados
    table.text('exames_solicitados').nullable().comment('Lista de exames solicitados');
    table.text('orientacoes_paciente').nullable().comment('Orientações gerais para o paciente');
    
    // Retorno e acompanhamento
    table.boolean('retorno_agendado').defaultTo(false).comment('Se foi agendado retorno');
    table.date('data_retorno').nullable().comment('Data do retorno agendado');
    table.text('observacoes_retorno').nullable().comment('Observações sobre o retorno');
    
    // Procedimentos realizados
    table.text('procedimentos_realizados').nullable().comment('Procedimentos médicos realizados durante o atendimento');
    
    // Status detalhado do destino
    table.text('detalhes_destino').nullable().comment('Detalhes sobre o destino do paciente (alta, transferência, etc.)');
    
    // Informações adicionais
    table.text('alergias_identificadas').nullable().comment('Alergias identificadas durante o atendimento');
    table.text('historico_familiar_relevante').nullable().comment('Histórico familiar relevante identificado');
    
    // Campos de auditoria médica
    table.timestamp('data_prescricao').nullable().comment('Data e hora da prescrição');
    table.integer('medico_supervisor_id').nullable().comment('ID do médico supervisor (se aplicável)');
    
    // Índices para melhor performance
    table.index(['atestado_emitido']);
    table.index(['necessita_observacao']);
    table.index(['retorno_agendado']);
    table.index(['data_retorno']);
  });
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
