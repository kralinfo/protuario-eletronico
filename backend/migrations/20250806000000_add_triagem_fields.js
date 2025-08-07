/**
 * Migration: 005_add_triagem_fields
 * Data: 2025-08-06
 * Descrição: Adiciona campos específicos para o módulo de triagem
 * 
 * Permite registrar sinais vitais, classificação de risco e dados clínicos
 * coletados durante a triagem dos pacientes.
 */

export const up = async function(knex) {
  await knex.schema.alterTable('atendimentos', function(table) {
    // === SINAIS VITAIS ===
    table.string('pressao_arterial', 20).nullable().comment('Pressão arterial - formato: 120/80');
    table.decimal('temperatura', 4, 1).nullable().comment('Temperatura corporal em graus Celsius');
    table.integer('frequencia_cardiaca').nullable().comment('Frequência cardíaca em BPM');
    table.integer('frequencia_respiratoria').nullable().comment('Frequência respiratória em RPM');
    table.integer('saturacao_oxigenio').nullable().comment('Saturação de oxigênio em %');
    table.decimal('peso', 5, 2).nullable().comment('Peso em kg');
    table.integer('altura').nullable().comment('Altura em cm');
    
    // === CLASSIFICAÇÃO DE RISCO ===
    table.string('classificacao_risco', 20).nullable().comment('Cor do protocolo: vermelho, laranja, amarelo, verde, azul');
    table.integer('prioridade').nullable().comment('Prioridade numérica: 1=emergência, 5=não urgente');
    
    // === DADOS CLÍNICOS ===
    table.text('queixa_principal').nullable().comment('Queixa principal do paciente');
    table.text('historia_atual').nullable().comment('História da doença atual');
    table.text('alergias').nullable().comment('Alergias conhecidas');
    table.text('medicamentos_uso').nullable().comment('Medicamentos em uso');
    table.text('observacoes_triagem').nullable().comment('Observações gerais da triagem');
    
    // === CONTROLE DE TRIAGEM ===
    table.integer('triagem_realizada_por').nullable()
      .references('id').inTable('usuarios')
      .comment('ID do profissional que realizou a triagem');
    table.timestamp('data_inicio_triagem').nullable().comment('Data/hora de início da triagem');
    table.timestamp('data_fim_triagem').nullable().comment('Data/hora de conclusão da triagem');
    
    // === ÍNDICES PARA PERFORMANCE ===
    table.index('classificacao_risco');
    table.index('prioridade');
    table.index('triagem_realizada_por');
  });
  
  console.log('✅ Campos de triagem adicionados à tabela atendimentos');
};

export const down = async function(knex) {
  await knex.schema.alterTable('atendimentos', function(table) {
    // Remover campos de sinais vitais
    table.dropColumn('pressao_arterial');
    table.dropColumn('temperatura');
    table.dropColumn('frequencia_cardiaca');
    table.dropColumn('frequencia_respiratoria');
    table.dropColumn('saturacao_oxigenio');
    table.dropColumn('peso');
    table.dropColumn('altura');
    
    // Remover classificação de risco
    table.dropColumn('classificacao_risco');
    table.dropColumn('prioridade');
    
    // Remover dados clínicos
    table.dropColumn('queixa_principal');
    table.dropColumn('historia_atual');
    table.dropColumn('alergias');
    table.dropColumn('medicamentos_uso');
    table.dropColumn('observacoes_triagem');
    
    // Remover controle de triagem
    table.dropColumn('triagem_realizada_por');
    table.dropColumn('data_inicio_triagem');
    table.dropColumn('data_fim_triagem');
  });
  
  console.log('⚠️  Campos de triagem removidos da tabela atendimentos');
};
