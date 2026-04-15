/**
 * Utilitário central para padronização de status de atendimentos.
 * Todos os status são convertidos para snake_case sem acentos.
 *
 * Este arquivo é a ÚNICA fonte de verdade para mapeamento de status.
 */

// Mapa de variantes → status canônico (snake_case)
const STATUS_ALIAS_MAP = {
  // ── Recepção ──
  'recepcao': 'recepcao',

  // ── Triagem Pendente ──
  'encaminhado para triagem': 'encaminhado_para_triagem',
  'encaminhado_para_triagem': 'encaminhado_para_triagem',
  'triagem pendente': 'encaminhado_para_triagem',
  'triagem_pendente': 'encaminhado_para_triagem',
  '1 - encaminhado para triagem': 'encaminhado_para_triagem',

  // ── Em Triagem ──
  'em triagem': 'em_triagem',
  'em_triagem': 'em_triagem',
  '2 - em triagem': 'em_triagem',

  // ── Triagem Finalizada ──
  'triagem_finalizada': 'triagem_finalizada',
  'triagem finalizada': 'triagem_finalizada',

  // ── Aguardando Médico / Encaminhado para Sala Médica ──
  'encaminhado para sala medica': 'encaminhado_para_sala_medica',
  'encaminhado para sala médica': 'encaminhado_para_sala_medica',
  'encaminhado_para_sala_medica': 'encaminhado_para_sala_medica',
  '3 - encaminhado para sala médica': 'encaminhado_para_sala_medica',
  '3 - encaminhado para sala medica': 'encaminhado_para_sala_medica',
  'em_sala_medica': 'encaminhado_para_sala_medica',
  'aguardando medico': 'encaminhado_para_sala_medica',
  'aguardando médico': 'encaminhado_para_sala_medica',
  'aguardando_medico': 'encaminhado_para_sala_medica',
  'aguardando': 'encaminhado_para_sala_medica',
  'aguardando_atendimento': 'encaminhado_para_sala_medica',
  'aguardando atendimento': 'encaminhado_para_sala_medica',

  // ── Em Atendimento Médico ──
  'em atendimento medico': 'em_atendimento_medico',
  'em atendimento médico': 'em_atendimento_medico',
  'em_atendimento_medico': 'em_atendimento_medico',
  'em atendimento': 'em_atendimento_medico',
  'em_atendimento': 'em_atendimento_medico',
  '4 - em atendimento médico': 'em_atendimento_medico',
  '4 - em atendimento medico': 'em_atendimento_medico',

  // ── Encaminhado para Ambulatório ──
  'encaminhado para ambulatorio': 'encaminhado_para_ambulatorio',
  'encaminhado para ambulatório': 'encaminhado_para_ambulatorio',
  'encaminhado_para_ambulatorio': 'encaminhado_para_ambulatorio',
  '5 - encaminhado para ambulatório': 'encaminhado_para_ambulatorio',
  '5 - encaminhado para ambulatorio': 'encaminhado_para_ambulatorio',
  'ambulatório': 'encaminhado_para_ambulatorio',
  'ambulatorio': 'encaminhado_para_ambulatorio',

  // ── Em Atendimento Ambulatorial ──
  'em atendimento ambulatorial': 'em_atendimento_ambulatorial',
  'em_atendimento_ambulatorial': 'em_atendimento_ambulatorial',
  '6 - em atendimento ambulatorial': 'em_atendimento_ambulatorial',

  // ── Encaminhado para Exames ──
  'encaminhado para exames': 'encaminhado_para_exames',
  'encaminhado para exame': 'encaminhado_para_exames',
  'encaminhado_para_exames': 'encaminhado_para_exames',
  '7 - encaminhado para exames': 'encaminhado_para_exames',
  'aguardando exames': 'encaminhado_para_exames',

  // ── Em Observação ──
  'em_observacao': 'em_observacao',
  'em observação': 'em_observacao',
  'em observacao': 'em_observacao',

  // ── Atendimento Concluído ──
  'atendimento concluido': 'atendimento_concluido',
  'atendimento concluído': 'atendimento_concluido',
  'atendimento_concluido': 'atendimento_concluido',
  'concluido': 'atendimento_concluido',
  'concluído': 'atendimento_concluido',
  'finalizado': 'atendimento_concluido',
  '8 - atendimento concluído': 'atendimento_concluido',
  '8 - atendimento concluido': 'atendimento_concluido',

  // ── Alta Médica ──
  'alta medica': 'alta_medica',
  'alta médica': 'alta_medica',
  'alta_medica': 'alta_medica',
  'alta': 'alta_medica',

  // ── Alta Ambulatorial ──
  'alta ambulatorial': 'alta_ambulatorial',
  'alta_ambulatorial': 'alta_ambulatorial',

  // ── Interrompido ──
  'interrompido': 'interrompido',

  // ── Abandonado ──
  'abandonado': 'abandonado',

  // ── Retornar ao Atendimento Médico ──
  'retornar_atendimento_medico': 'retornar_atendimento_medico',
  'retornar atendimento medico': 'retornar_atendimento_medico',

  // ── Transferido ──
  'transferido': 'transferido',

  // ── Óbito ──
  'obito': 'obito',
  'óbito': 'obito',

  // ── Encaminhado para Internação ──
  'encaminhado_para_internacao': 'encaminhado_para_internacao',
  'encaminhado para internação': 'encaminhado_para_internacao',
  'encaminhado para internacao': 'encaminhado_para_internacao',
};

/**
 * Normaliza um status para o formato canônico snake_case.
 * Se o status não for reconhecido, retorna ele limpo (lowercase, trimmed).
 *
 * @param {string} status - Status original (qualquer formato)
 * @returns {string} Status normalizado em snake_case
 */
export function normalizeStatus(status) {
  if (!status || typeof status !== 'string') return status;
  const cleaned = status.toLowerCase().trim();
  return STATUS_ALIAS_MAP[cleaned] || cleaned;
}

/**
 * Lista de todos os status canônicos válidos no sistema.
 */
export const VALID_STATUSES = [
  'recepcao',
  'encaminhado_para_triagem',
  'em_triagem',
  'triagem_finalizada',
  'encaminhado_para_sala_medica',
  'em_atendimento_medico',
  'encaminhado_para_ambulatorio',
  'em_atendimento_ambulatorial',
  'encaminhado_para_exames',
  'em_observacao',
  'atendimento_concluido',
  'alta_medica',
  'alta_ambulatorial',
  'interrompido',
  'abandonado',
  'retornar_atendimento_medico',
  'transferido',
  'obito',
  'encaminhado_para_internacao',
];

/**
 * Mapa de status canônico → label amigável para exibição.
 */
export const STATUS_LABELS = {
  'recepcao': 'Recepção',
  'encaminhado_para_triagem': 'Encaminhado para Triagem',
  'em_triagem': 'Em Triagem',
  'triagem_finalizada': 'Triagem Finalizada',
  'encaminhado_para_sala_medica': 'Encaminhado para Sala Médica',
  'em_atendimento_medico': 'Em Atendimento Médico',
  'encaminhado_para_ambulatorio': 'Encaminhado para Ambulatório',
  'em_atendimento_ambulatorial': 'Em Atendimento Ambulatorial',
  'encaminhado_para_exames': 'Encaminhado para Exames',
  'em_observacao': 'Em Observação',
  'atendimento_concluido': 'Atendimento Concluído',
  'alta_medica': 'Alta Médica',
  'alta_ambulatorial': 'Alta Ambulatorial',
  'interrompido': 'Interrompido',
  'abandonado': 'Abandonado',
  'retornar_atendimento_medico': 'Retornar ao Atendimento Médico',
  'transferido': 'Transferido',
  'obito': 'Óbito',
  'encaminhado_para_internacao': 'Encaminhado para Internação',
};

export default normalizeStatus;
