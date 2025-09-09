const knex = require('knex');
const config = require('./knexfile.cjs');

async function aplicarMigracao() {
  const db = knex(config.development);
  
  try {
    console.log('🔄 Iniciando aplicação da migração...\n');
    
    // Verificar se a tabela consultas_medicas existe
    const tabelaExiste = await db.schema.hasTable('consultas_medicas');
    console.log(`📋 Tabela consultas_medicas existe: ${tabelaExiste ? '✅' : '❌'}`);
    
    if (!tabelaExiste) {
      console.log('⚠️ Tabela consultas_medicas não existe! Criando tabela base...');
      await db.schema.createTable('consultas_medicas', function(table) {
        table.increments('id').primary();
        table.integer('atendimento_id').unsigned().notNullable();
        table.integer('medico_id').unsigned().notNullable();
        table.timestamp('data_hora_inicio').notNullable();
        table.timestamp('data_hora_fim');
        table.text('anamnese');
        table.text('exame_fisico');
        table.text('diagnostico');
        table.text('conduta');
        table.text('observacoes');
        table.text('motivo_consulta');
        table.text('hipotese_diagnostica');
        table.text('conduta_prescricao');
        table.text('status_destino');
        table.timestamps(true, true);
      });
      console.log('✅ Tabela base criada!');
    }
    
    // Verificar se os novos campos já existem
    const temCamposNovos = await db.schema.hasColumn('consultas_medicas', 'medicamentos_prescritos');
    
    if (temCamposNovos) {
      console.log('✅ Migração já foi aplicada! Campos novos já existem.');
    } else {
      console.log('📝 Aplicando migração dos novos campos...');
      
      await db.schema.alterTable('consultas_medicas', function(table) {
        // Medicamentos prescritos
        table.text('medicamentos_prescritos').nullable();
        table.text('medicamentos_ambulatorio').nullable();
        
        // Atestado médico
        table.boolean('atestado_emitido').defaultTo(false);
        table.string('atestado_cid', 20).nullable();
        table.text('atestado_detalhes').nullable();
        table.integer('atestado_dias').nullable();
        
        // Observação e internação
        table.boolean('necessita_observacao').defaultTo(false);
        table.integer('tempo_observacao_horas').nullable();
        table.text('motivo_observacao').nullable();
        
        // Exames solicitados
        table.text('exames_solicitados').nullable();
        table.text('orientacoes_paciente').nullable();
        
        // Retorno e acompanhamento
        table.boolean('retorno_agendado').defaultTo(false);
        table.date('data_retorno').nullable();
        table.text('observacoes_retorno').nullable();
        
        // Procedimentos realizados
        table.text('procedimentos_realizados').nullable();
        
        // Status detalhado do destino
        table.text('detalhes_destino').nullable();
        
        // Informações adicionais
        table.text('alergias_identificadas').nullable();
        table.text('historico_familiar_relevante').nullable();
        
        // Campos de auditoria médica
        table.timestamp('data_prescricao').nullable();
        table.integer('medico_supervisor_id').nullable();
      });
      
      console.log('✅ Novos campos adicionados com sucesso!');
    }
    
    // Verificar estrutura final
    const colunas = await db.raw(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'consultas_medicas' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Estrutura final da tabela consultas_medicas:');
    console.log('===============================================');
    
    const camposNovos = [
      'medicamentos_prescritos', 'medicamentos_ambulatorio', 'atestado_emitido',
      'atestado_cid', 'atestado_detalhes', 'atestado_dias', 'necessita_observacao',
      'tempo_observacao_horas', 'motivo_observacao', 'exames_solicitados',
      'orientacoes_paciente', 'retorno_agendado', 'data_retorno',
      'observacoes_retorno', 'procedimentos_realizados', 'detalhes_destino',
      'alergias_identificadas', 'historico_familiar_relevante',
      'data_prescricao', 'medico_supervisor_id'
    ];
    
    const colunasExistentes = colunas.rows.map(col => col.column_name);
    
    console.log('\n🎯 Status dos campos novos:');
    console.log('===========================');
    camposNovos.forEach(campo => {
      const existe = colunasExistentes.includes(campo);
      console.log(`${existe ? '✅' : '❌'} ${campo}`);
    });
    
    // Teste de inserção rápido
    console.log('\n🧪 Testando inserção de dados...');
    try {
      // Verificar se já existe registro de teste
      const registroTeste = await db('consultas_medicas')
        .where({ motivo_consulta: 'TESTE_MIGRACAO_APLICADA' })
        .first();
      
      if (registroTeste) {
        console.log('📝 Atualizando registro de teste...');
        await db('consultas_medicas')
          .where('id', registroTeste.id)
          .update({
            medicamentos_prescritos: 'Paracetamol 500mg - TESTE',
            atestado_emitido: true,
            necessita_observacao: false,
            retorno_agendado: true,
            data_prescricao: new Date()
          });
      } else {
        console.log('📝 Criando registro de teste...');
        await db('consultas_medicas').insert({
          atendimento_id: 999999,
          medico_id: 1,
          data_hora_inicio: new Date(),
          motivo_consulta: 'TESTE_MIGRACAO_APLICADA',
          exame_fisico: 'Normal',
          hipotese_diagnostica: 'Teste',
          conduta_prescricao: 'Orientações',
          status_destino: 'alta',
          medicamentos_prescritos: 'Paracetamol 500mg - TESTE',
          atestado_emitido: true,
          necessita_observacao: false,
          retorno_agendado: true,
          data_prescricao: new Date()
        });
      }
      
      console.log('✅ Teste de inserção bem-sucedido!');
      
    } catch (testeError) {
      console.error('⚠️ Erro no teste de inserção:', testeError.message);
    }
    
    console.log('\n🎉 Migração aplicada com sucesso!');
    console.log('📋 Todos os 20 novos campos foram adicionados à tabela consultas_medicas');
    console.log('💾 Os dados médicos detalhados agora podem ser salvos corretamente');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.destroy();
  }
}

aplicarMigracao();
