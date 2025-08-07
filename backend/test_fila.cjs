const knex = require('knex')(require('./knexfile.cjs').development);

async function testFilaTriagem() {
  try {
    // Simular a mesma query do método listarFilaTriagem
    const result = await knex.raw(`
      SELECT a.id, a.created_at, a.data_hora_atendimento, a.status, a.prioridade,
              a.classificacao_risco, a.queixa_principal,
              p.nome as paciente_nome, p.nascimento as paciente_nascimento,
              p.sexo as paciente_sexo
       FROM atendimentos a
       JOIN pacientes p ON p.id = a.paciente_id
       WHERE a.status IN ('encaminhado_para_triagem', '1 - Encaminhado para triagem', 'encaminhado para triagem')
         AND DATE(a.data_hora_atendimento) = CURRENT_DATE
       ORDER BY 
         a.prioridade ASC NULLS LAST,
         a.created_at ASC
    `);
    
    console.log('Pacientes na fila de triagem:');
    if (result.rows.length === 0) {
      console.log('Nenhum paciente encontrado.');
    } else {
      result.rows.forEach(row => {
        console.log(`ID: ${row.id}, Nome: ${row.paciente_nome}, Status: "${row.status}"`);
      });
    }
    
    knex.destroy();
  } catch (error) {
    console.error('Erro:', error);
    knex.destroy();
  }
}

testFilaTriagem();
