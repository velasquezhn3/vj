const fs = require('fs');
const path = require('path');
const db = require('../db');

/**
 * Script de validación de integridad de datos de cabañas
 * Compara JSON principal con base de datos y detecta inconsistencias
 */

async function validateCabinData() {
    console.log('🔍 INICIANDO VALIDACIÓN DE INTEGRIDAD DE DATOS\n');
    
    try {
        // 1. Cargar datos del JSON
        const jsonPath = path.join(__dirname, '../data/cabañas.json');
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        
        // 2. Cargar datos de la base de datos
        const dbData = await db.runQuery('SELECT * FROM Cabins');
        
        // 3. Validaciones
        const validations = {
            capacities: validateCapacities(jsonData, dbData),
            counts: validateCounts(jsonData, dbData),
            pricing: validatePricing(jsonData, dbData),
            descriptions: validateDescriptions(jsonData)
        };
        
        // 4. Generar reporte
        generateReport(validations);
        
    } catch (error) {
        console.error('❌ Error durante la validación:', error.message);
    }
}

function validateCapacities(jsonData, dbData) {
    console.log('📊 Validando capacidades...');
    const issues = [];
    
    jsonData.forEach(cabin => {
        const type = cabin.nombre.toLowerCase();
        const expectedCapacity = cabin.capacidad;
        
        // Buscar cabañas del mismo tipo en DB
        const dbCabins = dbData.filter(db => 
            db.name.toLowerCase().includes(type.split(' ')[1]) // tortuga, delfín, tiburón
        );
        
        dbCabins.forEach(dbCabin => {
            if (dbCabin.capacity !== expectedCapacity) {
                issues.push({
                    type: 'CAPACITY_MISMATCH',
                    cabin: dbCabin.name,
                    json_capacity: expectedCapacity,
                    db_capacity: dbCabin.capacity
                });
            }
        });
    });
    
    return issues;
}

function validateCounts(jsonData, dbData) {
    console.log('🔢 Validando cantidades...');
    const summary = {};
    
    // Contar por tipo en JSON (tipos de cabaña)
    jsonData.forEach(cabin => {
        const type = getType(cabin.nombre);
        summary[type] = summary[type] || { json: 1, db: 0 };
    });
    
    // Contar instancias físicas en DB
    dbData.forEach(cabin => {
        const type = getType(cabin.name);
        if (summary[type]) {
            summary[type].db++;
        }
    });
    
    return summary;
}

function validatePricing(jsonData, dbData) {
    console.log('💰 Validando precios...');
    const issues = [];
    
    jsonData.forEach(cabin => {
        const type = getType(cabin.nombre);
        const jsonPrice = cabin.precio_noche;
        
        const dbCabins = dbData.filter(db => getType(db.name) === type);
        dbCabins.forEach(dbCabin => {
            if (dbCabin.price && dbCabin.price !== jsonPrice) {
                issues.push({
                    type: 'PRICE_MISMATCH',
                    cabin_type: type,
                    json_price: jsonPrice,
                    db_price: dbCabin.price
                });
            }
        });
    });
    
    return issues;
}

function validateDescriptions(jsonData) {
    console.log('📝 Validando descripciones...');
    const issues = [];
    
    jsonData.forEach(cabin => {
        const desc = cabin.descripcion;
        const capacity = cabin.capacidad;
        const rooms = cabin.habitaciones;
        
        // Verificar consistencia en descripción
        const capacityInDesc = extractNumberFromText(desc, ['personas', 'person']);
        const roomsInDesc = extractNumberFromText(desc, ['cuarto', 'habitacion']);
        
        if (capacityInDesc && capacityInDesc !== capacity) {
            issues.push({
                type: 'DESCRIPTION_CAPACITY_MISMATCH',
                cabin: cabin.nombre,
                json_capacity: capacity,
                desc_capacity: capacityInDesc
            });
        }
        
        if (roomsInDesc && roomsInDesc !== rooms) {
            issues.push({
                type: 'DESCRIPTION_ROOMS_MISMATCH',
                cabin: cabin.nombre,
                json_rooms: rooms,
                desc_rooms: roomsInDesc
            });
        }
    });
    
    return issues;
}

function getType(name) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('tortuga')) return 'tortuga';
    if (nameLower.includes('delfín') || nameLower.includes('delfin')) return 'delfin';
    if (nameLower.includes('tiburón') || nameLower.includes('tiburon')) return 'tiburon';
    return 'unknown';
}

function extractNumberFromText(text, keywords) {
    for (const keyword of keywords) {
        const regex = new RegExp(`(\\d+)\\s*${keyword}`, 'i');
        const match = text.match(regex);
        if (match) return parseInt(match[1]);
    }
    return null;
}

function generateReport(validations) {
    console.log('\n📋 REPORTE DE VALIDACIÓN\n');
    console.log('=' .repeat(50));
    
    // Capacidades
    if (validations.capacities.length === 0) {
        console.log('✅ Capacidades: CONSISTENTES');
    } else {
        console.log('❌ Capacidades: INCONSISTENCIAS DETECTADAS');
        validations.capacities.forEach(issue => {
            console.log(`   - ${issue.cabin}: JSON=${issue.json_capacity}, DB=${issue.db_capacity}`);
        });
    }
    
    // Cantidades
    console.log('\n📊 Resumen de cantidades:');
    Object.keys(validations.counts).forEach(type => {
        const count = validations.counts[type];
        console.log(`   - ${type}: ${count.db} instancias físicas`);
    });
    
    // Precios
    if (validations.pricing.length === 0) {
        console.log('\n✅ Precios: CONSISTENTES');
    } else {
        console.log('\n❌ Precios: INCONSISTENCIAS DETECTADAS');
        validations.pricing.forEach(issue => {
            console.log(`   - ${issue.cabin_type}: JSON=${issue.json_price}, DB=${issue.db_price}`);
        });
    }
    
    // Descripciones
    if (validations.descriptions.length === 0) {
        console.log('\n✅ Descripciones: CONSISTENTES');
    } else {
        console.log('\n⚠️ Descripciones: REVISAR');
        validations.descriptions.forEach(issue => {
            console.log(`   - ${issue.type}: ${issue.cabin}`);
        });
    }
    
    console.log('\n' + '=' .repeat(50));
}

// Ejecutar si se llama directamente
if (require.main === module) {
    validateCabinData();
}

module.exports = { validateCabinData };
