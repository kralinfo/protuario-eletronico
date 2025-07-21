
-- Drop e cria primeiro as tabelas principais
DROP TABLE IF EXISTS atendimentos;
DROP TABLE IF EXISTS pacientes;
DROP TABLE IF EXISTS usuarios;
-- Criação das tabelas principais
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  nome VARCHAR(100),
  nivel VARCHAR(20) NOT NULL DEFAULT 'visualizador',
  modulos TEXT[] DEFAULT ARRAY['recepcao'],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pacientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  mae VARCHAR(100),
  nascimento DATE NOT NULL,
  sexo VARCHAR(1),
  estado_civil VARCHAR(20),
  profissao VARCHAR(50),
  escolaridade VARCHAR(50),
  telefone character varying(20),
  sus character varying(20),
  raca VARCHAR(20),
  endereco VARCHAR(150),
  bairro VARCHAR(50),
  municipio VARCHAR(50),
  uf VARCHAR(2),
  cep VARCHAR(9),
  acompanhante VARCHAR(100),
  procedencia VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_nome_nascimento UNIQUE (nome, nascimento)
);

-- Agora sim, cria a tabela atendimentos
CREATE TABLE IF NOT EXISTS atendimentos (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  data_atendimento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_hora_chegada TIMESTAMP,
  descricao TEXT,
  status VARCHAR(20) DEFAULT 'aberto',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Tabela de usuários para autenticação

INSERT INTO pacientes (nome, mae, nascimento, sexo, estado_civil, profissao, escolaridade, telefone, sus, raca, endereco, bairro, municipio, uf, cep, acompanhante, procedencia)
VALUES
  ('Joao Silva', 'Maria Silva45', '1980-05-10', 'M', 'Solteiro', 'Professor', 'Superior', '(11) 99999-1111', '123456789012345', 'Branca', 'Rua das Flores, 123', 'Centro', 'Sao Paulo', 'SP', '01001-000', 'Carlos Silva', 'Residencia'),
  ('Ana Souza', 'Clara Souza', '1992-11-23', 'F', 'Casada', 'Enfermeira', 'Medio', '(21) 98888-2222', '987654321098765', 'Parda', 'Av. Brasil, 456', 'Jardim', 'Rio de Janeiro', 'RJ', '20000-000', 'Paulo Souza', 'Hospital'),
  ('Marcos Lima', 'Helena Lima', '1975-03-15', 'M', 'Divorciado', 'Engenheiro', 'Superior', '(31) 97777-3333', '111222333444555', 'Preta', 'Rua Verde, 789', 'Industrial', 'Belo Horizonte', 'MG', '30000-000', 'Lucas Lima', 'Clinica');

-- Inserir usuários de teste (senha: 123456)
INSERT INTO usuarios (email, senha, nome, nivel, modulos) VALUES
  ('admin@alianca.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Administrador', 'admin', ARRAY['recepcao','triagem','medico','ambulatorio']),
  ('medico@alianca.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Dr. João Silva', 'editor', ARRAY['medico','ambulatorio']),
  ('medico1@teste.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Dr. Teste', 'editor', ARRAY['medico']),
  ('enfermeiro@alianca.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Enfermeiro Paulo', 'visualizador', ARRAY['triagem']),
  ('fpsjunior87@gmail.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Fernando Junior', 'admin', ARRAY['recepcao','triagem','medico','ambulatorio']),
  ('visual@teste.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Visualizador', 'visualizador', ARRAY['recepcao']),
  ('editor@teste.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Editor', 'editor', ARRAY['ambulatorio']),
  ('multi@teste.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Multi Módulos', 'editor', ARRAY['recepcao','ambulatorio']),
  ('recepcao@teste.com', '$2b$12$fTaXt0BM9Hz/e4PfjvI..uk2yr8d.iqBdXwEsP0gIhKiRtS5bCpfS', 'Recepção', 'visualizador', ARRAY['recepcao']);
ON CONFLICT (email) DO NOTHING;