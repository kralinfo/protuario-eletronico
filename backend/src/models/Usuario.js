import database from '../config/database.js';
import bcrypt from 'bcryptjs';
import config from '../config/env.js';

class Usuario {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.nome = data.nome;
    this.nivel = data.nivel;
    this.senha = data.senha;
    this.modulos = data.modulos || [];
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Buscar usuário por ID
   */
  static async findById(id) {
    try {
      const result = await database.query(
        'SELECT * FROM usuarios WHERE id = $1',
        [id]
      );
      return result.rows.length > 0 ? new Usuario(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Erro ao buscar usuário por ID: ${error.message}`);
    }
  }

  /**
   * Buscar usuário por email
   */
  static async findByEmail(email) {
    try {
      const result = await database.query(
        'SELECT * FROM usuarios WHERE email = $1',
        [email.toLowerCase()]
      );
      return result.rows.length > 0 ? new Usuario(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Erro ao buscar usuário por email: ${error.message}`);
    }
  }

  /**
   * Criar novo usuário
   */
  static async create(userData) {
    try {
      const { email, senha, nome, nivel, modulos } = userData;
      // Verificar se email já existe
      const existingUser = await Usuario.findByEmail(email);
      if (existingUser) {
        throw new Error('Email já está em uso');
      }
      // Hash da senha
      const hashedPassword = await bcrypt.hash(senha, config.BCRYPT_ROUNDS);
      const result = await database.query(
        `INSERT INTO usuarios (email, senha, nome, nivel, modulos, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING *`,
        [email.toLowerCase(), hashedPassword, nome, nivel || 'visualizador', modulos || ['recepcao']]
      );
      return new Usuario(result.rows[0]);
    } catch (error) {
      throw new Error(`Erro ao criar usuário: ${error.message}`);
    }
  }

  /**
   * Atualizar usuário
   */
  static async update(id, userData) {
    try {
      const updates = [];
      const values = [];
      let paramIndex = 1;

      // Construir query dinâmica
      Object.keys(userData).forEach(key => {
        if (userData[key] !== undefined && key !== 'id') {
          if (key === 'senha') {
            updates.push(`${key} = $${paramIndex}`);
            values.push(bcrypt.hashSync(userData[key], config.BCRYPT_ROUNDS));
          } else if (key === 'email') {
            updates.push(`${key} = $${paramIndex}`);
            values.push(userData[key].toLowerCase());
          } else if (key === 'modulos') {
            updates.push(`${key} = $${paramIndex}`);
            values.push(userData[key]);
          } else {
            updates.push(`${key} = $${paramIndex}`);
            values.push(userData[key]);
          }
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }

      values.push(id);
      const result = await database.query(
        `UPDATE usuarios 
         SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $${paramIndex} 
         RETURNING *`,
        values
      );
      return result.rows.length > 0 ? new Usuario(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Erro ao atualizar usuário: ${error.message}`);
    }
  }

  /**
   * Deletar usuário
   */
  static async delete(id) {
    try {
      const result = await database.query(
        'DELETE FROM usuarios WHERE id = $1 RETURNING *',
        [id]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Erro ao deletar usuário: ${error.message}`);
    }
  }

  /**
   * Listar todos os usuários
   */
  static async findAll(options = {}) {
    try {
      const { limit = 50, offset = 0, orderBy = 'created_at', order = 'DESC' } = options;
      const result = await database.query(
        `SELECT id, email, nome, nivel, modulos, created_at, updated_at
         FROM usuarios
         ORDER BY ${orderBy} ${order}
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return result.rows.map(row => new Usuario(row));
    } catch (error) {
      throw new Error(`Erro ao listar usuários: ${error.message}`);
    }
  }

  /**
   * Contar total de usuários
   */
  static async count() {
    try {
      const result = await database.query('SELECT COUNT(*) as total FROM usuarios');
      return parseInt(result.rows[0].total);
    } catch (error) {
      throw new Error(`Erro ao contar usuários: ${error.message}`);
    }
  }

  /**
   * Verificar senha
   */
  async checkPassword(password) {
    try {
      return await bcrypt.compare(password, this.senha);
    } catch (error) {
      throw new Error(`Erro ao verificar senha: ${error.message}`);
    }
  }

  /**
   * Atualizar senha
   */
  async updatePassword(newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);
      
      await database.query(
        'UPDATE usuarios SET senha = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedPassword, this.id]
      );
      
      this.senha = hashedPassword;
      return true;
    } catch (error) {
      throw new Error(`Erro ao atualizar senha: ${error.message}`);
    }
  }

  /**
   * Retornar dados públicos (sem senha)
   */
  toPublicJSON() {
    return {
      id: this.id,
      email: this.email,
      nome: this.nome,
      nivel: this.nivel,
      modulos: this.modulos,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Verificar se tabela existe
   */
  static async tableExists() {
    try {
      const result = await database.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'usuarios'
        )`
      );
      
      return result.rows[0].exists;
    } catch (error) {
      return false;
    }
  }
}

export default Usuario;
