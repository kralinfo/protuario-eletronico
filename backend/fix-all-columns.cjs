const { Client } = require('pg');

async function fixAllMissingColumns() {
    console.log('🚨🚨🚨 FIX COMPLETO INICIADO! 🚨🚨🚨');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENTE' : 'AUSENTE');
    
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Conectado ao banco de dados!');

        // Lista de todas as colunas que precisam existir
        const requiredColumns = [
            { name: 'assinatura_digital', type: 'TEXT', nullable: true },
            { name: 'assinado', type: 'BOOLEAN', defaultValue: 'false' },
            { name: 'data_assinatura', type: 'TIMESTAMP', nullable: true },
            { name: 'abandonado', type: 'BOOLEAN', defaultValue: 'false' },
            { name: 'data_abandono', type: 'TIMESTAMP', nullable: true },
            { name: 'motivo_abandono', type: 'VARCHAR(500)', nullable: true },
            { name: 'usuario_abandono_id', type: 'INTEGER', nullable: true },
            { name: 'etapa_abandono', type: 'VARCHAR(50)', nullable: true }
        ];

        console.log('🔍 Verificando colunas existentes...');
        
        // Verificar quais colunas já existem
        const existingColumnsQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'atendimentos' 
            AND column_name IN (${requiredColumns.map(col => `'${col.name}'`).join(', ')});
        `;
        
        const existingResult = await client.query(existingColumnsQuery);
        const existingColumns = existingResult.rows.map(row => row.column_name);
        
        console.log('Colunas existentes:', existingColumns);

        // Adicionar colunas que estão faltando
        for (const column of requiredColumns) {
            if (!existingColumns.includes(column.name)) {
                console.log(`❌ Coluna "${column.name}" não existe. Criando...`);
                
                let sql = `ALTER TABLE atendimentos ADD COLUMN ${column.name} ${column.type}`;
                
                if (column.nullable) {
                    sql += ' NULL';
                } else if (column.defaultValue) {
                    sql += ` NOT NULL DEFAULT ${column.defaultValue}`;
                }
                
                sql += ';';
                
                try {
                    await client.query(sql);
                    console.log(`✅ Coluna "${column.name}" criada com sucesso!`);
                } catch (error) {
                    console.error(`❌ Erro ao criar coluna "${column.name}":`, error.message);
                }
            } else {
                console.log(`✅ Coluna "${column.name}" já existe!`);
            }
        }

        // Verificação final
        console.log('🔍 Verificação final...');
        const finalResult = await client.query(existingColumnsQuery);
        const finalColumns = finalResult.rows.map(row => row.column_name);
        
        console.log('Colunas após a correção:', finalColumns);
        
        const missingColumns = requiredColumns
            .map(col => col.name)
            .filter(name => !finalColumns.includes(name));
            
        if (missingColumns.length === 0) {
            console.log('🎉 TODAS as colunas estão presentes!');
        } else {
            console.log('❌ Ainda faltam colunas:', missingColumns);
        }
        
    } catch (error) {
        console.error('❌ Erro no fix completo:', error);
    } finally {
        await client.end();
        console.log('🚨🚨🚨 FIX COMPLETO FINALIZADO! 🚨🚨🚨');
    }
}

fixAllMissingColumns();
