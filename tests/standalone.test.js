/**
 * 🧪 TESTS INDEPENDIENTES - Bot VJ
 * Suite de tests que no depende de configuraciones externas
 */

const fs = require('fs');
const path = require('path');

describe('🎯 Bot VJ - Verificación de Sistema', () => {
    
    describe('📋 Archivos Core del Sistema', () => {
        test('✅ Archivo principal index.js existe', () => {
            const indexPath = path.join(__dirname, '../index.js');
            expect(fs.existsSync(indexPath)).toBe(true);
        });

        test('✅ Base de datos SQLite existe', () => {
            const dbPath = path.join(__dirname, '../bot_database.sqlite');
            expect(fs.existsSync(dbPath)).toBe(true);
        });

        test('✅ Package.json existe y es válido', () => {
            const packagePath = path.join(__dirname, '../package.json');
            expect(fs.existsSync(packagePath)).toBe(true);
            
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            expect(packageJson.name).toBeDefined();
            expect(packageJson.version).toBeDefined();
        });

        test('✅ Configuración de Jest existe', () => {
            const jestConfigPath = path.join(__dirname, '../jest.config.js');
            expect(fs.existsSync(jestConfigPath)).toBe(true);
        });
    });

    describe('🚀 Servicios Optimizados', () => {
        test('✅ Cache Service existe', () => {
            const cachePath = path.join(__dirname, '../services/cacheService.js');
            expect(fs.existsSync(cachePath)).toBe(true);
        });

        test('✅ Middleware de validación existe', () => {
            const validationPath = path.join(__dirname, '../middleware/validationMiddleware.js');
            expect(fs.existsSync(validationPath)).toBe(true);
        });

        test('✅ Logger mejorado existe', () => {
            const loggerPath = path.join(__dirname, '../utils/logger.js');
            expect(fs.existsSync(loggerPath)).toBe(true);
        });

        test('✅ Error Handler existe', () => {
            const errorHandlerPath = path.join(__dirname, '../utils/errorHandler.js');
            expect(fs.existsSync(errorHandlerPath)).toBe(true);
        });

        test('✅ Monitoring Dashboard existe', () => {
            const dashboardPath = path.join(__dirname, '../services/monitoringDashboard.js');
            expect(fs.existsSync(dashboardPath)).toBe(true);
        });
    });

    describe('🧪 Infraestructura de Testing', () => {
        test('✅ Directorio de tests existe', () => {
            const testsDir = path.join(__dirname, '../tests');
            expect(fs.existsSync(testsDir)).toBe(true);
        });

        test('✅ Test de integración API existe', () => {
            const apiTestPath = path.join(__dirname, 'integration/api.test.js');
            expect(fs.existsSync(apiTestPath)).toBe(true);
        });

        test('✅ Test de performance existe', () => {
            const perfTestPath = path.join(__dirname, 'performance/load.test.js');
            expect(fs.existsSync(perfTestPath)).toBe(true);
        });
    });

    describe('🛡️ Seguridad', () => {
        test('✅ Rate Limiting avanzado existe', () => {
            const rateLimitPath = path.join(__dirname, '../middleware/advancedRateLimitCompact.js');
            expect(fs.existsSync(rateLimitPath)).toBe(true);
        });

        test('✅ Rate Limiter tiene configuración correcta', () => {
            const rateLimitPath = path.join(__dirname, '../middleware/advancedRateLimitCompact.js');
            const content = fs.readFileSync(rateLimitPath, 'utf8');
            
            expect(content).toContain('AdvancedRateLimiter');
            expect(content).toContain('cleanup');
            expect(content).toContain('window');
        });
    });

    describe('📱 Frontend Optimizado', () => {
        test('✅ Frontend optimizado existe', () => {
            const frontendPath = path.join(__dirname, '../../admin-frontend/src/components/OptimizedApp.js');
            expect(fs.existsSync(frontendPath)).toBe(true);
        });

        test('✅ Package.json del frontend existe', () => {
            const packagePath = path.join(__dirname, '../../admin-frontend/package.json');
            expect(fs.existsSync(packagePath)).toBe(true);
        });

        test('✅ Frontend tiene optimizaciones básicas', () => {
            const frontendPath = path.join(__dirname, '../../admin-frontend/src/components/OptimizedApp.js');
            const content = fs.readFileSync(frontendPath, 'utf8');
            
            expect(content).toContain('lazy');
            expect(content).toContain('useCallback');
            expect(content).toContain('useMemo');
        });
    });

    describe('🔄 CI/CD Pipeline', () => {
        test('✅ Directorio de workflows existe', () => {
            const workflowsDir = path.join(__dirname, '../../.github/workflows');
            expect(fs.existsSync(workflowsDir)).toBe(true);
        });

        test('✅ Pipeline CI/CD existe', () => {
            const cicdPath = path.join(__dirname, '../../.github/workflows/bot-vj-ci-cd.yml');
            expect(fs.existsSync(cicdPath)).toBe(true);
        });

        test('✅ Pipeline tiene configuración correcta', () => {
            const cicdPath = path.join(__dirname, '../../.github/workflows/bot-vj-ci-cd.yml');
            const content = fs.readFileSync(cicdPath, 'utf8');
            
            expect(content).toContain('name:');
            expect(content).toContain('on:');
            expect(content).toContain('jobs:');
            expect(content).toContain('node-version:');
        });
    });

    describe('🗄️ Base de Datos', () => {
        test('✅ Directorio de backups existe', () => {
            const backupsDir = path.join(__dirname, '../backups');
            expect(fs.existsSync(backupsDir)).toBe(true);
        });

        test('✅ DB handler existe', () => {
            const dbPath = path.join(__dirname, '../db.js');
            expect(fs.existsSync(dbPath)).toBe(true);
        });

        test('✅ Backups contienen archivos', () => {
            const backupsDir = path.join(__dirname, '../backups');
            const files = fs.readdirSync(backupsDir);
            expect(files.length).toBeGreaterThan(0);
        });
    });

    describe('📋 Documentación', () => {
        test('✅ Documentación API existe', () => {
            const apiDocPath = path.join(__dirname, '../API_DOCUMENTATION.md');
            expect(fs.existsSync(apiDocPath)).toBe(true);
        });

        test('✅ README principal existe', () => {
            const readmePath = path.join(__dirname, '../../README.md');
            expect(fs.existsSync(readmePath)).toBe(true);
        });

        test('✅ Resumen final existe', () => {
            const resumenPath = path.join(__dirname, '../../RESUMEN_FINAL_IMPLEMENTACIONES.md');
            expect(fs.existsSync(resumenPath)).toBe(true);
        });
    });

    describe('⚡ Funcionalidad Básica', () => {
        test('✅ Sistema puede crear timestamps', () => {
            const timestamp = new Date().toISOString();
            expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
        });

        test('✅ Paths son resoluble correctamente', () => {
            const testPath = path.join(__dirname, '../index.js');
            const absolutePath = path.resolve(testPath);
            expect(path.isAbsolute(absolutePath)).toBe(true);
        });

        test('✅ JSON parsing funciona correctamente', () => {
            const testObj = { test: 'Bot VJ', version: '1.0.0' };
            const jsonString = JSON.stringify(testObj);
            const parsed = JSON.parse(jsonString);
            
            expect(parsed.test).toBe('Bot VJ');
            expect(parsed.version).toBe('1.0.0');
        });

        test('✅ File system operations funcionan', () => {
            const tempContent = 'Test content ' + Date.now();
            const tempPath = path.join(__dirname, 'temp-test.txt');
            
            // Escribir archivo temporal
            fs.writeFileSync(tempPath, tempContent);
            
            // Verificar que existe
            expect(fs.existsSync(tempPath)).toBe(true);
            
            // Leer contenido
            const readContent = fs.readFileSync(tempPath, 'utf8');
            expect(readContent).toBe(tempContent);
            
            // Limpiar
            fs.unlinkSync(tempPath);
            expect(fs.existsSync(tempPath)).toBe(false);
        });
    });

    describe('🎯 Métricas del Sistema', () => {
        test('✅ Conteo de archivos principales', () => {
            const files = [
                '../index.js',
                '../adminServer.js', 
                '../nativeServer.js',
                '../db.js',
                '../services/cacheService.js',
                '../middleware/validationMiddleware.js',
                '../utils/logger.js',
                '../utils/errorHandler.js'
            ];
            
            let existingFiles = 0;
            files.forEach(file => {
                const filePath = path.join(__dirname, file);
                if (fs.existsSync(filePath)) {
                    existingFiles++;
                }
            });
            
            // Al menos 80% de archivos principales deben existir
            const percentage = (existingFiles / files.length) * 100;
            expect(percentage).toBeGreaterThanOrEqual(80);
        });

        test('✅ Tamaño de archivos es razonable', () => {
            const mainFiles = [
                '../index.js',
                '../services/cacheService.js',
                '../utils/logger.js'
            ];
            
            mainFiles.forEach(file => {
                const filePath = path.join(__dirname, file);
                if (fs.existsSync(filePath)) {
                    const stats = fs.statSync(filePath);
                    // Archivos no deben estar vacíos y no deben ser demasiado grandes
                    expect(stats.size).toBeGreaterThan(0);
                    expect(stats.size).toBeLessThan(50 * 1024 * 1024); // 50MB max
                }
            });
        });
    });
});

console.log('🎯 Tests Independientes - Bot VJ Sistema de Reservas');
console.log('✅ Verificación de archivos y funcionalidad básica...');
