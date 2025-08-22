const knex = require('../db');

module.exports = {
  listarAtendimentosSalaMedica: () =>
    knex('atendimentos').where('status', 'em_sala_medica').select('*'),

  buscarConsulta: (id) =>
    knex('consultas_medicas').where('id', id).first(),

  criarConsulta: (dados) =>
    knex('consultas_medicas').insert(dados).returning('*'),

  atualizarConsulta: (id, dados) =>
    knex('consultas_medicas').where('id', id).update(dados)
};
