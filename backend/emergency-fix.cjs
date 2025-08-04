const { Client } = require('pg');

async function emergencyFix() {
    console.log('🚨🚨🚨 EMERGENCY FIX INICIADO! 🚨🚨🚨');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENTE' : 'AUSENTE');
    
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        console.log('✅ Conectado ao banco de dados!');

        // Verificar se a coluna existe
        const checkColumn = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'atendimentos' AND column_name = 'abandonado';
        `;
        
        const checkResult = await client.query(checkColumn);
        console.log('Resultado verificação coluna:', checkResult.rows);

        if (checkResult.rows.length === 0) {
            console.log('❌ Coluna "abandonado" não existe. Criando...');
            
            const sql = `
                ALTER TABLE atendimentos 
                ADD COLUMN IF NOT EXISTS abandonado BOOLEAN DEFAULT false;
            `;
            
            await client.query(sql);
            console.log('✅ Coluna "abandonado" criada com sucesso!');
        } else {
            console.log('✅ Coluna "abandonado" já existe!');
        }

        // Verificar novamente
        const finalCheck = await client.query(checkColumn);
        console.log('Verificação final:', finalCheck.rows);
        
    } catch (error) {
        console.error('❌ Erro no emergency fix:', error);
    } finally {
        await client.end();
        console.log('🚨🚨🚨 EMERGENCY FIX FINALIZADO! 🚨🚨🚨');
    }
}

emergencyFix();
