-- =============================================================
-- Migração: Padronização de status para snake_case canônico
-- Executa UPDATE em atendimentos para normalizar todos os
-- status variantes para o formato canônico snake_case.
-- =============================================================

BEGIN;

-- ── Triagem Pendente ──
UPDATE atendimentos SET status = 'encaminhado_para_triagem'
WHERE status IN (
  'encaminhado para triagem',
  'triagem pendente',
  'triagem_pendente',
  '1 - Encaminhado para triagem',
  '1 - encaminhado para triagem'
) AND status != 'encaminhado_para_triagem';

-- ── Em Triagem ──
UPDATE atendimentos SET status = 'em_triagem'
WHERE status IN (
  'em triagem',
  '2 - Em triagem',
  '2 - em triagem'
) AND status != 'em_triagem';

-- ── Triagem Finalizada ──
UPDATE atendimentos SET status = 'triagem_finalizada'
WHERE status IN (
  'triagem finalizada'
) AND status != 'triagem_finalizada';

-- ── Encaminhado para Sala Médica ──
UPDATE atendimentos SET status = 'encaminhado_para_sala_medica'
WHERE status IN (
  'encaminhado para sala medica',
  'encaminhado para sala médica',
  '3 - Encaminhado para sala médica',
  '3 - encaminhado para sala médica',
  '3 - encaminhado para sala medica',
  'em_sala_medica',
  'aguardando medico',
  'aguardando médico',
  'aguardando_medico',
  'aguardando',
  'aguardando_atendimento',
  'aguardando atendimento'
) AND status != 'encaminhado_para_sala_medica';

-- ── Em Atendimento Médico ──
UPDATE atendimentos SET status = 'em_atendimento_medico'
WHERE status IN (
  'em atendimento medico',
  'em atendimento médico',
  'em atendimento',
  'em_atendimento',
  '4 - Em atendimento médico',
  '4 - em atendimento médico',
  '4 - em atendimento medico'
) AND status != 'em_atendimento_medico';

-- ── Encaminhado para Ambulatório ──
UPDATE atendimentos SET status = 'encaminhado_para_ambulatorio'
WHERE status IN (
  'encaminhado para ambulatorio',
  'encaminhado para ambulatório',
  '5 - Encaminhado para ambulatório',
  '5 - encaminhado para ambulatório',
  '5 - encaminhado para ambulatorio',
  'ambulatório',
  'ambulatorio'
) AND status != 'encaminhado_para_ambulatorio';

-- ── Em Atendimento Ambulatorial ──
UPDATE atendimentos SET status = 'em_atendimento_ambulatorial'
WHERE status IN (
  'em atendimento ambulatorial',
  '6 - Em atendimento ambulatorial',
  '6 - em atendimento ambulatorial'
) AND status != 'em_atendimento_ambulatorial';

-- ── Encaminhado para Exames ──
UPDATE atendimentos SET status = 'encaminhado_para_exames'
WHERE status IN (
  'encaminhado para exames',
  'encaminhado para exame',
  '7 - Encaminhado para exames',
  '7 - encaminhado para exames',
  'aguardando exames'
) AND status != 'encaminhado_para_exames';

-- ── Em Observação ──
UPDATE atendimentos SET status = 'em_observacao'
WHERE status IN (
  'em observação',
  'em observacao'
) AND status != 'em_observacao';

-- ── Atendimento Concluído ──
UPDATE atendimentos SET status = 'atendimento_concluido'
WHERE status IN (
  'atendimento concluido',
  'atendimento concluído',
  'concluido',
  'concluído',
  'finalizado',
  '8 - Atendimento concluído',
  '8 - atendimento concluído',
  '8 - atendimento concluido'
) AND status != 'atendimento_concluido';

-- ── Alta Médica ──
UPDATE atendimentos SET status = 'alta_medica'
WHERE status IN (
  'alta medica',
  'alta médica',
  'alta'
) AND status != 'alta_medica';

-- ── Alta Ambulatorial ──
UPDATE atendimentos SET status = 'alta_ambulatorial'
WHERE status IN (
  'alta ambulatorial'
) AND status != 'alta_ambulatorial';

-- ── Retornar Atendimento Médico ──
UPDATE atendimentos SET status = 'retornar_atendimento_medico'
WHERE status IN (
  'retornar atendimento medico'
) AND status != 'retornar_atendimento_medico';

-- ── Óbito ──
UPDATE atendimentos SET status = 'obito'
WHERE status IN (
  'óbito'
) AND status != 'obito';

-- ── Encaminhado para Internação ──
UPDATE atendimentos SET status = 'encaminhado_para_internacao'
WHERE status IN (
  'encaminhado para internação',
  'encaminhado para internacao'
) AND status != 'encaminhado_para_internacao';

-- ── Padronizar status_destino também ──
UPDATE atendimentos SET status_destino = 'encaminhado_para_sala_medica'
WHERE status_destino IN (
  'encaminhado para sala médica',
  'encaminhado para sala medica',
  '3 - Encaminhado para sala médica'
) AND status_destino != 'encaminhado_para_sala_medica';

UPDATE atendimentos SET status_destino = 'encaminhado_para_ambulatorio'
WHERE status_destino IN (
  'encaminhado para ambulatório',
  'encaminhado para ambulatorio',
  '5 - Encaminhado para ambulatório'
) AND status_destino != 'encaminhado_para_ambulatorio';

UPDATE atendimentos SET status_destino = 'encaminhado_para_exames'
WHERE status_destino IN (
  'encaminhado para exames',
  '7 - Encaminhado para exames'
) AND status_destino != 'encaminhado_para_exames';

-- Verificar resultado
SELECT status, COUNT(*) as total FROM atendimentos GROUP BY status ORDER BY total DESC;

COMMIT;
