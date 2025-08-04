CREATE TABLE atendimentos (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  data_hora_chegada TIMESTAMP NOT NULL DEFAULT NOW(),
  motivo VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'triagem pendente',
  observacoes TEXT
);
