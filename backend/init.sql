
DROP TABLE IF EXISTS atendimentos;
DROP TABLE IF EXISTS pacientes;
DROP TABLE IF EXISTS usuarios;

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  nome VARCHAR(100),
  nivel VARCHAR(20) NOT NULL DEFAULT 'visualizador',
  modulos TEXT[],
  reset_token VARCHAR(255),
  reset_token_expira TIMESTAMP,
  reset_token_usado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pacientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  mae VARCHAR(100),
  nascimento DATE NOT NULL,
  sexo VARCHAR(1) CHECK (sexo IN ('M', 'F', 'I')),
  estado_civil VARCHAR(20),
  profissao VARCHAR(50),
  escolaridade VARCHAR(50),
  telefone VARCHAR(20),
  sus VARCHAR(20),
  raca VARCHAR(20),
  endereco VARCHAR(150),
  bairro VARCHAR(50),
  municipio VARCHAR(50),
  uf VARCHAR(2),
  cep VARCHAR(9),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_nome_nascimento UNIQUE (nome, nascimento)
);

CREATE TABLE atendimentos (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  data_hora_atendimento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motivo VARCHAR(255),
  descricao TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'encaminhado_para_triagem',
  observacoes TEXT,
  motivo_interrupcao VARCHAR(255) DEFAULT 'N/A',
  acompanhante VARCHAR(100),
  procedencia VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Tabela de usuários para autenticação

INSERT INTO pacientes (nome, mae, nascimento, sexo, estado_civil, profissao, escolaridade, telefone, sus, raca, endereco, bairro, municipio, uf, cep)
VALUES
  ('Joao Silva', 'Maria Silva45', '1980-05-10', 'M', 'Solteiro', 'Professor', 'Superior', '(11) 99999-1111', '123456789012345', 'Branca', 'Rua das Flores, 123', 'Centro', 'Sao Paulo', 'SP', '01001-000'),
  ('Ana Souza', 'Clara Souza', '1992-11-23', 'F', 'Casada', 'Enfermeira', 'Medio', '(21) 98888-2222', '987654321098765', 'Parda', 'Av. Brasil, 456', 'Jardim', 'Rio de Janeiro', 'RJ', '20000-000'),
  ('Marcos Lima', 'Helena Lima', '1975-03-15', 'M', 'Divorciado', 'Engenheiro', 'Superior', '(31) 97777-3333', '111222333444555', 'Preta', 'Rua Verde, 789', 'Industrial', 'Belo Horizonte', 'MG', '30000-000');

-- Inserir usuários de teste (senha: 123456)
INSERT INTO usuarios (
  email, senha, nome, nivel, modulos, reset_token, reset_token_expira, reset_token_usado
) VALUES
  ('admin@alianca.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Administrador', 'admin', '{recepcao,triagem,medico,ambulatorio}', NULL, NULL, FALSE),
  ('medico@alianca.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Dr. João Silva', 'editor', '{medico,ambulatorio}', NULL, NULL, FALSE),
  ('medico1@teste.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Dr. Teste', 'editor', '{medico}', NULL, NULL, FALSE),
  ('enfermeiro@alianca.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Enfermeiro Paulo', 'visualizador', '{triagem}', NULL, NULL, FALSE),
  ('fpsjunior87@gmail.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Fernando Junior', 'admin', '{recepcao,triagem,medico,ambulatorio}', NULL, NULL, FALSE),
  ('visual@teste.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Visualizador', 'visualizador', '{recepcao}', NULL, NULL, FALSE),
  ('editor@teste.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Editor', 'editor', '{ambulatorio}', NULL, NULL, FALSE),
  ('multi@teste.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Multi Módulos', 'editor', '{recepcao,ambulatorio}', NULL, NULL, FALSE),
  ('recepcao@teste.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Recepção', 'visualizador', '{recepcao}', NULL, NULL, FALSE);
ON CONFLICT (email) DO NOTHING;
