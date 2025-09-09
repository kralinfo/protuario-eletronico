const knex = require('knex');
const config = require('./knexfile.cjs');

async function applyMigration() {
  const db = knex(config.development);
  
  try {
    console.log('🔧 Aplicando migração para consultas_medicas...\n');
    
    // Verificar se a tabela existe
    const tableExists = await db.schema.hasTable('consultas_medicas');
    
    if (!tableExists) {
      console.log('❌ Tabela consultas_medicas não existe! Criando...');
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
    }
    
    // Verificar se os novos campos já existem
    const hasNewFields = await db.schema.hasColumn('consultas_medicas', 'medicamentos_prescritos');
    
    if (!hasNewFields) {
      console.log('✅ Adicionando novos campos...');
      
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
    } else {
      console.log('✅ Novos campos já existem na tabela!');
    }
    
    // Verificar estrutura final
    const columns = await db.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consultas_medicas' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Estrutura final da tabela:');
    console.log('============================');
    columns.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\n✅ Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
  } finally {
    await db.destroy();
  }
}

applyMigration();
