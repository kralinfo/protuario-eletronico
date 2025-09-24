/**
 * Migration: 005_add_triagem_fields
 * Data: 2025-08-06
 * Descrição: Adiciona campos específicos para o módulo de triagem
 * 
 * Permite registrar sinais vitais, classificação de risco e dados clínicos
 * coletados durante a triagem dos pacientes.
 */

exports.up = async function(knex) {
  // Adiciona cada coluna apenas se não existir
  const colunas = [
    { nome: 'pressao_arterial', tipo: t => t.string('pressao_arterial', 20).nullable().comment('Pressão arterial - formato: 120/80') },
    { nome: 'temperatura', tipo: t => t.decimal('temperatura', 4, 1).nullable().comment('Temperatura corporal em graus Celsius') },
    { nome: 'frequencia_cardiaca', tipo: t => t.integer('frequencia_cardiaca').nullable().comment('Frequência cardíaca em BPM') },
    { nome: 'frequencia_respiratoria', tipo: t => t.integer('frequencia_respiratoria').nullable().comment('Frequência respiratória em RPM') },
    { nome: 'saturacao_oxigenio', tipo: t => t.integer('saturacao_oxigenio').nullable().comment('Saturação de oxigênio em %') },
    { nome: 'peso', tipo: t => t.decimal('peso', 5, 2).nullable().comment('Peso em kg') },
    { nome: 'altura', tipo: t => t.integer('altura').nullable().comment('Altura em cm') },
    { nome: 'classificacao_risco', tipo: t => t.string('classificacao_risco', 20).nullable().comment('Cor do protocolo: vermelho, laranja, amarelo, verde, azul') },
    { nome: 'prioridade', tipo: t => t.integer('prioridade').nullable().comment('Prioridade numérica: 1=emergência, 5=não urgente') },
    { nome: 'queixa_principal', tipo: t => t.text('queixa_principal').nullable().comment('Queixa principal do paciente') },
    { nome: 'historia_atual', tipo: t => t.text('historia_atual').nullable().comment('História da doença atual') },
    { nome: 'alergias', tipo: t => t.text('alergias').nullable().comment('Alergias conhecidas') },
    { nome: 'medicamentos_uso', tipo: t => t.text('medicamentos_uso').nullable().comment('Medicamentos em uso') },
    { nome: 'observacoes_triagem', tipo: t => t.text('observacoes_triagem').nullable().comment('Observações gerais da triagem') },
    { nome: 'triagem_realizada_por', tipo: t => t.integer('triagem_realizada_por').nullable().references('id').inTable('usuarios').comment('ID do profissional que realizou a triagem') },
    { nome: 'data_inicio_triagem', tipo: t => t.timestamp('data_inicio_triagem').nullable().comment('Data/hora de início da triagem') },
    { nome: 'data_fim_triagem', tipo: t => t.timestamp('data_fim_triagem').nullable().comment('Data/hora de conclusão da triagem') }
  ];

  for (const col of colunas) {
    const exists = await knex.schema.hasColumn('atendimentos', col.nome);
    if (!exists) {
      await knex.schema.alterTable('atendimentos', col.tipo);
      console.log(`✅ Coluna ${col.nome} adicionada à tabela atendimentos`);
    } else {
      console.log(`ℹ️  Coluna ${col.nome} já existe - pulando`);
    }
  }

  // Índices para performance (só cria se não existir)
  const indices = ['classificacao_risco', 'prioridade', 'triagem_realizada_por'];
  for (const idx of indices) {
    try {
      await knex.schema.alterTable('atendimentos', t => t.index(idx));
    } catch (e) {
      // ignora erro se índice já existe
    }
  }

  console.log('✅ Campos de triagem adicionados à tabela atendimentos (safe)');
};

exports.down = async function(knex) {
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
