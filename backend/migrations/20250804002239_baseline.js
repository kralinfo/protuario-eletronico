/**
 * Migration: 000_baseline
 * Data: 2025-08-04
 * Descrição: Migration baseline - marca o estado inicial do banco
 * 
 * Esta migration não faz alterações porque as tabelas já existem.
 * Serve apenas para estabelecer um ponto de partida para o controle de versão.
 */

exports.up = async function(knex) {
  // Nada a fazer - as tabelas usuarios, pacientes e atendimentos já existem
  console.log('✅ Baseline migration aplicada - banco já está no estado inicial');
};

exports.down = async function(knex) {
  // Em caso de rollback, não removemos as tabelas existentes
  console.log('⚠️  Rollback da baseline - mantendo tabelas existentes');
};
