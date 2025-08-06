const { Client } = require('pg');

async function removeUnusedColumns() {
    console.log('🚨🚨🚨 REMOVENDO COLUNAS NÃO USADAS! 🚨🚨🚨');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENTE' : 'AUSENTE');
    
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Conectado ao banco de dados!');

        // Colunas de assinatura digital que não são usadas
        const unusedColumns = ['assinatura_digital', 'assinado', 'data_assinatura'];

        console.log('🔍 Verificando colunas de assinatura digital...');
        
        // Verificar quais dessas colunas existem
        const existingColumnsQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'atendimentos' 
            AND column_name IN (${unusedColumns.map(col => `'${col}'`).join(', ')});
        `;
        
        const existingResult = await client.query(existingColumnsQuery);
        const existingColumns = existingResult.rows.map(row => row.column_name);
        
        console.log('Colunas de assinatura existentes:', existingColumns);

        // Remover colunas que existem mas não são usadas
        for (const column of unusedColumns) {
            if (existingColumns.includes(column)) {
                console.log(`🗑️  Removendo coluna não usada "${column}"...`);
                
                const sql = `ALTER TABLE atendimentos DROP COLUMN IF EXISTS ${column};`;
                
                try {
                    await client.query(sql);
                    console.log(`✅ Coluna "${column}" removida com sucesso!`);
                } catch (error) {
                    console.error(`❌ Erro ao remover coluna "${column}":`, error.message);
                }
            } else {
                console.log(`ℹ️  Coluna "${column}" não existe.`);
            }
        }

        // Verificação final
        console.log('🔍 Verificação final...');
        const finalResult = await client.query(existingColumnsQuery);
        const remainingColumns = finalResult.rows.map(row => row.column_name);
        
        if (remainingColumns.length === 0) {
            console.log('🎉 Todas as colunas não usadas foram removidas!');
        } else {
            console.log('⚠️  Ainda restam colunas:', remainingColumns);
        }
        
        console.log('✅ Limpeza concluída! Mantidas apenas as colunas de abandono que são usadas.');
        
    } catch (error) {
        console.error('❌ Erro na limpeza:', error);
    } finally {
        await client.end();
        console.log('🚨🚨🚨 LIMPEZA FINALIZADA! 🚨🚨🚨');
    }
}

removeUnusedColumns();
