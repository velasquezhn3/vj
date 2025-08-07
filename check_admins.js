const db = require('./db');

async function checkAdmins() {
    console.log('👤 Verificando usuarios administradores...');
    
    try {
        // Verificar si existe la tabla Admins
        const tables = await db.runQuery(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='Admins'
        `);
        
        if (tables.length === 0) {
            console.log('❌ Tabla Admins no existe');
            return;
        }
        
        // Verificar admins existentes
        const admins = await db.runQuery(`
            SELECT admin_id, username, email, role, is_active, created_at 
            FROM Admins 
            ORDER BY admin_id
        `);
        
        console.log(`\n📊 Encontrados ${admins.length} administradores:`);
        if (admins.length === 0) {
            console.log('⚠️ No hay administradores registrados');
        } else {
            admins.forEach(admin => {
                console.log(`- ID: ${admin.admin_id}, Usuario: ${admin.username}, Email: ${admin.email}, Activo: ${admin.is_active}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

checkAdmins();
