const knex = require('knex');
const config = require('./knexfile.cjs');

async function checkDatabase() {
  const db = knex(config.development);
  
  try {
    console.log('🔍 Verificando estrutura da tabela consultas_medicas...\n');
    
    // Verificar se a tabela existe
    const tableExists = await db.schema.hasTable('consultas_medicas');
    console.log(`✅ Tabela consultas_medicas existe: ${tableExists}\n`);
    
    if (tableExists) {
      // Buscar informações das colunas
      const columns = await db.raw(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'consultas_medicas' 
        ORDER BY ordinal_position
      `);
      
      console.log('📊 Colunas encontradas na tabela consultas_medicas:');
      console.log('==========================================');
      columns.rows.forEach(col => {
        console.log(`${col.column_name.padEnd(30)} | ${col.data_type.padEnd(15)} | Nullable: ${col.is_nullable}`);
      });
      
      // Verificar se os novos campos estão presentes
      const newFields = [
        'medicamentos_prescritos',
        'medicamentos_ambulatorio', 
        'atestado_emitido',
        'atestado_cid',
        'atestado_detalhes',
        'atestado_dias',
        'necessita_observacao',
        'tempo_observacao_horas',
        'motivo_observacao',
        'exames_solicitados',
        'orientacoes_paciente',
        'retorno_agendado',
        'data_retorno',
        'observacoes_retorno',
        'procedimentos_realizados',
        'detalhes_destino',
        'alergias_identificadas',
        'historico_familiar_relevante',
        'data_prescricao',
        'medico_supervisor_id'
      ];
      
      const existingColumns = columns.rows.map(col => col.column_name);
      
      console.log('\n🔍 Verificando novos campos:');
      console.log('============================');
      newFields.forEach(field => {
        const exists = existingColumns.includes(field);
        const status = exists ? '✅' : '❌';
        console.log(`${status} ${field}`);
      });
      
      // Testar inserção de dados
      console.log('\n🧪 Testando inserção de dados...');
      try {
        const testData = {
          atendimento_id: 1,
          medico_id: 1,
          data_hora_inicio: new Date(),
          motivo_consulta: 'Teste de inserção',
          exame_fisico: 'Teste',
          hipotese_diagnostica: 'Teste',
          conduta_prescricao: 'Teste',
          status_destino: 'alta médica',
          medicamentos_prescritos: 'Teste medicamento',
          atestado_emitido: true,
          necessita_observacao: false,
          retorno_agendado: true,
          data_retorno: new Date()
        };
        
        // Primeiro verificar se já existe algum registro de teste
        const existing = await db('consultas_medicas').where({ motivo_consulta: 'Teste de inserção' }).first();
        
        if (existing) {
          console.log('✅ Registro de teste já existe - atualizando...');
          await db('consultas_medicas').where('id', existing.id).update(testData);
          console.log('✅ Atualização realizada com sucesso!');
        } else {
          console.log('✅ Inserindo novo registro de teste...');
          const result = await db('consultas_medicas').insert(testData).returning('*');
          console.log('✅ Inserção realizada com sucesso!');
          console.log(`ID do registro criado: ${result[0]?.id}`);
        }
      } catch (insertError) {
        console.error('❌ Erro ao testar inserção:', insertError.message);
      }
      
    } else {
      console.log('❌ Tabela consultas_medicas não existe!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error.message);
  } finally {
    await db.destroy();
  }
}

checkDatabase();
