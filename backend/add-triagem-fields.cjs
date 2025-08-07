const { Client } = require('pg');

async function addTriagemFields() {
    console.log('🚨🚨🚨 ADICIONANDO CAMPOS DE TRIAGEM! 🚨🚨🚨');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENTE' : 'AUSENTE');
    
    // Configuração do banco - local ou produção
    let connectionConfig;
    
    if (process.env.DATABASE_URL) {
        // Produção - usar DATABASE_URL com SSL
        connectionConfig = {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        };
    } else {
        // Local - usar configuração padrão sem SSL
        connectionConfig = {
            host: 'localhost',
            port: 5432,
            database: 'prontuario',
            user: 'postgres',
            password: 'postgres',
            ssl: false
        };
    }
    
    const client = new Client(connectionConfig);

    try {
        await client.connect();
        console.log('✅ Conectado ao banco de dados!');

        // Campos de triagem que precisam ser adicionados
        const camposTriagem = [
            { name: 'pressao_arterial', type: 'VARCHAR(20)', nullable: true },
            { name: 'temperatura', type: 'DECIMAL(4,1)', nullable: true },
            { name: 'frequencia_cardiaca', type: 'INTEGER', nullable: true },
            { name: 'frequencia_respiratoria', type: 'INTEGER', nullable: true },
            { name: 'saturacao_oxigenio', type: 'INTEGER', nullable: true },
            { name: 'peso', type: 'DECIMAL(5,2)', nullable: true },
            { name: 'altura', type: 'INTEGER', nullable: true },
            { name: 'classificacao_risco', type: 'VARCHAR(20)', nullable: true },
            { name: 'prioridade', type: 'INTEGER', nullable: true },
            { name: 'queixa_principal', type: 'TEXT', nullable: true },
            { name: 'historia_atual', type: 'TEXT', nullable: true },
            { name: 'alergias', type: 'TEXT', nullable: true },
            { name: 'medicamentos_uso', type: 'TEXT', nullable: true },
            { name: 'observacoes_triagem', type: 'TEXT', nullable: true },
            { name: 'triagem_realizada_por', type: 'INTEGER', nullable: true },
            { name: 'data_inicio_triagem', type: 'TIMESTAMP', nullable: true },
            { name: 'data_fim_triagem', type: 'TIMESTAMP', nullable: true }
        ];

        console.log('🔍 Verificando colunas existentes...');
        
        // Verificar quais colunas já existem
        const existingColumnsQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'atendimentos' 
            AND column_name IN (${camposTriagem.map(col => `'${col.name}'`).join(', ')});
        `;
        
        const existingResult = await client.query(existingColumnsQuery);
        const existingColumns = existingResult.rows.map(row => row.column_name);
        
        console.log('Colunas de triagem existentes:', existingColumns);

        // Adicionar colunas que estão faltando
        for (const campo of camposTriagem) {
            if (!existingColumns.includes(campo.name)) {
                console.log(`❌ Coluna "${campo.name}" não existe. Criando...`);
                
                let sql = `ALTER TABLE atendimentos ADD COLUMN ${campo.name} ${campo.type}`;
                
                if (campo.nullable) {
                    sql += ' NULL';
                }
                
                sql += ';';
                
                try {
                    await client.query(sql);
                    console.log(`✅ Coluna "${campo.name}" criada com sucesso!`);
                } catch (error) {
                    console.error(`❌ Erro ao criar coluna "${campo.name}":`, error.message);
                }
            } else {
                console.log(`✅ Coluna "${campo.name}" já existe!`);
            }
        }

        // Criar índices se não existirem
        const indices = [
            { name: 'idx_atendimentos_classificacao_risco', column: 'classificacao_risco' },
            { name: 'idx_atendimentos_prioridade', column: 'prioridade' },
            { name: 'idx_atendimentos_triagem_realizada_por', column: 'triagem_realizada_por' }
        ];

        for (const indice of indices) {
            try {
                const sql = `CREATE INDEX IF NOT EXISTS ${indice.name} ON atendimentos (${indice.column});`;
                await client.query(sql);
                console.log(`✅ Índice "${indice.name}" criado!`);
            } catch (error) {
                console.log(`ℹ️  Índice "${indice.name}" já existe ou erro:`, error.message);
            }
        }

        // Verificação final
        console.log('🔍 Verificação final...');
        const finalResult = await client.query(existingColumnsQuery);
        const finalColumns = finalResult.rows.map(row => row.column_name);
        
        console.log('Colunas de triagem após a correção:', finalColumns);
        
        const missingColumns = camposTriagem
            .map(col => col.name)
            .filter(name => !finalColumns.includes(name));
            
        if (missingColumns.length === 0) {
            console.log('🎉 TODAS as colunas de triagem estão presentes!');
        } else {
            console.log('❌ Ainda faltam colunas:', missingColumns);
        }
        
    } catch (error) {
        console.error('❌ Erro ao adicionar campos de triagem:', error);
    } finally {
        await client.end();
        console.log('🚨🚨🚨 CAMPOS DE TRIAGEM FINALIZADOS! 🚨🚨🚨');
    }
}

addTriagemFields();
