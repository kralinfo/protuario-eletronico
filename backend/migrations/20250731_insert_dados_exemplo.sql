INSERT INTO usuarios (email, senha, nome, nivel, permissoes) VALUES
  ('admin1@teste.com', 'senha1', 'Admin Um', 'admin', '{recepcao,triagem,medico,ambulatorio}'),
  ('admin2@teste.com', 'senha2', 'Admin Dois', 'admin', '{recepcao,triagem}'),
  ('medico1@teste.com', 'senha3', 'Medico Um', 'editor', '{medico}'),
  ('enfermeiro1@teste.com', 'senha4', 'Enfermeiro Um', 'visualizador', '{triagem}'),
  ('usuario1@teste.com', 'senha5', 'Usuario Um', 'visualizador', '{recepcao}');

INSERT INTO pacientes (nome, mae, nascimento, sexo, estado_civil, profissao, escolaridade, telefone, sus, raca, endereco, bairro, municipio, uf, cep) VALUES
  ('Carlos Silva', 'Maria Silva', '1985-01-10', 'M', 'Solteiro', 'Professor', 'Superior', '(11) 90000-0001', '111111111111111', 'Branca', 'Rua A, 1', 'Centro', 'Sao Paulo', 'SP', '01000-000'),
  ('Fernanda Souza', 'Ana Souza', '1990-02-20', 'F', 'Casada', 'Enfermeira', 'Medio', '(21) 90000-0002', '222222222222222', 'Parda', 'Rua B, 2', 'Jardim', 'Rio de Janeiro', 'RJ', '20000-000'),
  ('Paulo Lima', 'Helena Lima', '1978-03-30', 'M', 'Divorciado', 'Engenheiro', 'Superior', '(31) 90000-0003', '333333333333333', 'Preta', 'Rua C, 3', 'Industrial', 'Belo Horizonte', 'MG', '30000-000'),
  ('Juliana Costa', 'Beatriz Costa', '1982-04-15', 'F', 'Solteira', 'Advogada', 'Superior', '(41) 90000-0004', '444444444444444', 'Branca', 'Rua D, 4', 'Centro', 'Curitiba', 'PR', '80000-000'),
  ('Lucas Pereira', 'Patricia Pereira', '1995-05-25', 'M', 'Casado', 'Analista', 'Superior', '(51) 90000-0005', '555555555555555', 'Parda', 'Rua E, 5', 'Bairro Novo', 'Porto Alegre', 'RS', '90000-000');

INSERT INTO atendimentos (paciente_id, usuario_id, data_hora_atendimento, status, motivo_interrupcao, acompanhante, procedencia, descricao) VALUES
  (1, 1, NOW(), 'recepcao', 'N/A', 'Acompanhante 1', 'Procedencia 1', 'Atendimento de rotina 1'),
  (2, 2, NOW(), 'triagem', 'N/A', 'Acompanhante 2', 'Procedencia 2', 'Atendimento de rotina 2'),
  (3, 3, NOW(), 'medico', 'N/A', 'Acompanhante 3', 'Procedencia 3', 'Atendimento de rotina 3'),
  (4, 4, NOW(), 'ambulatorio', 'N/A', 'Acompanhante 4', 'Procedencia 4', 'Atendimento de rotina 4'),
  (5, 5, NOW(), 'recepcao', 'N/A', 'Acompanhante 5', 'Procedencia 5', 'Atendimento de rotina 5');
