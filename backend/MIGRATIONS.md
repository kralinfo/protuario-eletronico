# 🗃️ Sistema de Migrations - Prontuário Eletrônico

## 📋 Visão Geral

Sistema de versionamento de banco de dados usando **Knex.js** para garantir que todas as mudanças de schema sejam aplicadas consistentemente em todas as ambientes.

## 🚀 Comandos Principais

### Aplicar Migrations
```bash
# Aplicar todas as migrations pendentes
npm run db:migrate

# Ou usando o script personalizado
npm run migrate latest
```

### Reverter Migrations
```bash
# Reverter a última migration
npm run db:rollback

# Reverter todas as migrations
npm run db:reset
```

### Status das Migrations
```bash
# Ver quais migrations foram aplicadas
npm run db:status
```

### Criar Nova Migration
```bash
# Criar uma nova migration
npm run db:make nome_da_migration

# Exemplo
npm run db:make add_telefone_column
```

## 📁 Estrutura de Arquivos

```
backend/
├── knexfile.js                 # Configuração do Knex
├── migrate.js                  # Script utilitário
├── migrations/                 # Pasta com migrations
│   ├── 001_create_initial_tables.js
│   └── 002_add_unique_sus_constraint.js
└── seeds/                      # Dados iniciais (opcional)
```

## 📖 Migrations Existentes

### 001_create_initial_tables.js
- **Descrição**: Criação das tabelas iniciais (usuarios, pacientes, atendimentos)
- **Recursos**: Índices, triggers, constraints
- **Status**: ✅ Implementada

### 002_add_unique_sus_constraint.js
- **Descrição**: Adiciona constraint UNIQUE na coluna SUS
- **Recursos**: Validação de duplicatas, índice parcial
- **Status**: ✅ Implementada

## 🔧 Configuração

### Variáveis de Ambiente
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=protuario
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false
```

### Ambientes Suportados
- **development**: Banco local de desenvolvimento
- **production**: Banco de produção
- **test**: Banco para testes

## 📝 Como Criar uma Nova Migration

### 1. Gerar o arquivo
```bash
npm run db:make add_new_feature
```

### 2. Implementar a migration
```javascript
/**
 * Migration: 003_add_new_feature
 * Data: 2025-08-03
 * Descrição: Adiciona nova funcionalidade
 */

export async function up(knex) {
  await knex.schema.alterTable('pacientes', function(table) {
    table.string('telefone_celular', 15);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('pacientes', function(table) {
    table.dropColumn('telefone_celular');
  });
}
```

### 3. Aplicar a migration
```bash
npm run db:migrate
```

## 🚨 Boas Práticas

### ✅ Fazer
- **Sempre teste** a migration em desenvolvimento primeiro
- **Implemente rollback** para todas as mudanças
- **Documente** o propósito da migration
- **Use transações** para operações complexas
- **Valide dados** antes de aplicar constraints

### ❌ Evitar
- **Não edite** migrations já aplicadas em produção
- **Não remova** migrations sem rollback adequado
- **Não faça** mudanças muito grandes em uma migration
- **Não esqueça** de testar o rollback

## 🔄 Fluxo de Desenvolvimento

### Para Desenvolvedores
1. **Criar branch** para nova feature
2. **Criar migration** se necessário
3. **Testar migration** localmente
4. **Commitar** migration junto com código
5. **Fazer merge** na branch principal

### Para Deploy
1. **Backup** do banco de produção
2. **Executar migrations** no ambiente de staging
3. **Testar aplicação** no staging
4. **Aplicar migrations** em produção
5. **Monitorar** aplicação pós-deploy

## 🆘 Resolução de Problemas

### Migration falhou
```bash
# Ver status atual
npm run db:status

# Reverter se necessário
npm run db:rollback

# Corrigir problema e tentar novamente
npm run db:migrate
```

### Conflitos de Schema
```bash
# Reset completo (CUIDADO!)
npm run db:reset

# Ou manualmente
npm run db:rollback --all
npm run db:migrate
```

### Dados Duplicados
```bash
# Executar queries de limpeza antes da migration
# Exemplo para SUS duplicado:
SELECT sus, COUNT(*) FROM pacientes GROUP BY sus HAVING COUNT(*) > 1;
```

## 🔗 Links Úteis

- [Documentação do Knex.js](https://knexjs.org/)
- [Schema Builder](https://knexjs.org/guide/schema-builder.html)
- [Migrations Guide](https://knexjs.org/guide/migrations.html)

---

## 📞 Suporte

Em caso de dúvidas sobre migrations:
1. Verifique este README
2. Consulte a documentação do Knex.js
3. Execute `npm run migrate help`
4. Entre em contato com a equipe de desenvolvimento
