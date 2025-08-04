const fs = require('fs');
const path = require('path');
const db = require('../db');

/**
 * Script de sincronización bidireccional entre JSON y base de datos
 * Mantiene ambas fuentes actualizadas automáticamente
 */

class CabinSynchronizer {
    constructor() {
        this.jsonPath = path.join(__dirname, '../data/cabañas.json');
        this.backupPath = path.join(__dirname, '../data/backups');
        this.ensureBackupDirectory();
    }

    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupPath)) {
            fs.mkdirSync(this.backupPath, { recursive: true });
        }
    }

    async syncFromJsonToDb() {
        console.log('🔄 Sincronizando desde JSON hacia Base de Datos...\n');
        
        try {
            const jsonData = this.loadJsonData();
            
            for (const cabin of jsonData) {
                await this.updateDbFromJson(cabin);
            }
            
            console.log('✅ Sincronización JSON → DB completada');
        } catch (error) {
            console.error('❌ Error en sincronización JSON → DB:', error.message);
        }
    }

    async syncFromDbToJson() {
        console.log('🔄 Sincronizando desde Base de Datos hacia JSON...\n');
        
        try {
            // Crear backup del JSON actual
            this.createBackup();
            
            const dbData = await db.runQuery('SELECT * FROM Cabins');
            const jsonData = this.loadJsonData();
            
            // Actualizar datos en JSON basado en DB
            for (const jsonCabin of jsonData) {
                await this.updateJsonFromDb(jsonCabin, dbData);
            }
            
            // Guardar JSON actualizado
            this.saveJsonData(jsonData);
            
            console.log('✅ Sincronización DB → JSON completada');
        } catch (error) {
            console.error('❌ Error en sincronización DB → JSON:', error.message);
        }
    }

    async updateDbFromJson(cabin) {
        const type = this.getType(cabin.nombre);
        const capacity = cabin.capacidad;
        const price = cabin.precio_noche;
        
        // Actualizar todas las cabañas del mismo tipo en DB
        const query = `
            UPDATE Cabins 
            SET capacity = ?, price = ?, updated_at = datetime('now')
            WHERE name LIKE ?
        `;
        
        const pattern = `%${this.getTypePattern(type)}%`;
        await db.runExecute(query, [capacity, price, pattern]);
        
        console.log(`📝 Actualizado en DB: ${type} → capacidad: ${capacity}, precio: ${price}`);
    }

    async updateJsonFromDb(jsonCabin, dbData) {
        const type = this.getType(jsonCabin.nombre);
        const dbCabins = dbData.filter(db => this.getType(db.name) === type);
        
        if (dbCabins.length > 0) {
            const dbCabin = dbCabins[0]; // Usar el primero como referencia
            
            // Actualizar capacidad y precio si hay diferencias
            if (jsonCabin.capacidad !== dbCabin.capacity) {
                console.log(`📝 Actualizando capacidad en JSON: ${jsonCabin.nombre} ${jsonCabin.capacidad} → ${dbCabin.capacity}`);
                jsonCabin.capacidad = dbCabin.capacity;
                jsonCabin.tipo = `${dbCabin.capacity} personas`;
                jsonCabin.nombre = jsonCabin.nombre.replace(/\(\d+ Personas\)/, `(${dbCabin.capacity} Personas)`);
            }
            
            if (jsonCabin.precio_noche !== dbCabin.price && dbCabin.price) {
                console.log(`📝 Actualizando precio en JSON: ${jsonCabin.nombre} ${jsonCabin.precio_noche} → ${dbCabin.price}`);
                jsonCabin.precio_noche = dbCabin.price;
            }
        }
    }

    loadJsonData() {
        return JSON.parse(fs.readFileSync(this.jsonPath, 'utf8'));
    }

    saveJsonData(data) {
        fs.writeFileSync(this.jsonPath, JSON.stringify(data, null, 2), 'utf8');
    }

    createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(this.backupPath, `cabañas_backup_${timestamp}.json`);
        fs.copyFileSync(this.jsonPath, backupFile);
        console.log(`💾 Backup creado: ${backupFile}`);
    }

    getType(name) {
        const nameLower = name.toLowerCase();
        if (nameLower.includes('tortuga')) return 'tortuga';
        if (nameLower.includes('delfín') || nameLower.includes('delfin')) return 'delfin';
        if (nameLower.includes('tiburón') || nameLower.includes('tiburon')) return 'tiburon';
        return 'unknown';
    }

    getTypePattern(type) {
        const patterns = {
            'tortuga': 'Tortuga',
            'delfin': 'Delfín',
            'tiburon': 'Tiburón'
        };
        return patterns[type] || type;
    }

    async fullSync() {
        console.log('🚀 INICIANDO SINCRONIZACIÓN COMPLETA\n');
        console.log('=' .repeat(50));
        
        // Primero sincronizar desde JSON (fuente de verdad)
        await this.syncFromJsonToDb();
        
        console.log('\n' + '-'.repeat(30) + '\n');
        
        // Luego verificar consistencia
        const validator = require('./validate_cabin_data');
        await validator.validateCabinData();
        
        console.log('\n' + '=' .repeat(50));
        console.log('✅ SINCRONIZACIÓN COMPLETA FINALIZADA');
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const args = process.argv.slice(2);
    const synchronizer = new CabinSynchronizer();
    
    if (args.includes('--json-to-db')) {
        synchronizer.syncFromJsonToDb();
    } else if (args.includes('--db-to-json')) {
        synchronizer.syncFromDbToJson();
    } else {
        synchronizer.fullSync();
    }
}

module.exports = CabinSynchronizer;
