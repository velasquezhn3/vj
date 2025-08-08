const fs = require('fs');
const path = require('path');

/**
 * Test básico para validar la estructura del proyecto después de la limpieza
 */

describe('🧪 Sistema Bot VJ - Tests Básicos', () => {
  
  describe('📁 Estructura del Proyecto', () => {
    test('✅ Debe existir el archivo principal index.js', () => {
      const indexPath = path.join(__dirname, '../../index.js');
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    test('✅ Debe existir adminServer.js', () => {
      const adminPath = path.join(__dirname, '../../adminServer.js');
      expect(fs.existsSync(adminPath)).toBe(true);
    });

    test('✅ Debe existir db.js', () => {
      const dbPath = path.join(__dirname, '../../db.js');
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    test('✅ Debe existir package.json válido', () => {
      const packagePath = path.join(__dirname, '../../package.json');
      expect(fs.existsSync(packagePath)).toBe(true);
      
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      expect(packageJson.name).toBeDefined();
      expect(packageJson.version).toBeDefined();
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.dependencies).toBeDefined();
    });
  });

  describe('📂 Carpetas Esenciales', () => {
    const essentialFolders = [
      'controllers',
      'services', 
      'routes',
      'models',
      'middleware',
      'config',
      'data'
    ];

    essentialFolders.forEach(folder => {
      test(`✅ Debe existir carpeta ${folder}`, () => {
        const folderPath = path.join(__dirname, '../../', folder);
        expect(fs.existsSync(folderPath)).toBe(true);
      });
    });
  });

  describe('🔧 Configuración Esencial', () => {
    test('✅ Debe existir configuración Jest', () => {
      const jestPath = path.join(__dirname, '../../jest.config.js');
      expect(fs.existsSync(jestPath)).toBe(true);
    });

    test('✅ Debe existir archivo .env.example', () => {
      const envPath = path.join(__dirname, '../../.env.example');
      expect(fs.existsSync(envPath)).toBe(true);
    });

    test('✅ Debe existir documentación API', () => {
      const apiDocPath = path.join(__dirname, '../../API_DOCUMENTATION.md');
      expect(fs.existsSync(apiDocPath)).toBe(true);
    });
  });

  describe('🎯 Scripts NPM', () => {
    test('✅ Debe tener scripts esenciales definidos', () => {
      const packagePath = path.join(__dirname, '../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      const essentialScripts = [
        'start',
        'admin',
        'test',
        'monitoring'
      ];
      
      essentialScripts.forEach(script => {
        expect(packageJson.scripts[script]).toBeDefined();
      });
    });
  });

  describe('🔍 Limpieza Exitosa', () => {
    test('❌ No deben existir archivos de test temporales', () => {
      const tempTestFiles = [
        'test-api.js',
        'test-bot-flows.js',
        'verify-fix.js',
        'diagnose-tests.js'
      ];
      
      tempTestFiles.forEach(file => {
        const filePath = path.join(__dirname, '../../', file);
        expect(fs.existsSync(filePath)).toBe(false);
      });
    });

    test('❌ No deben existir archivos de documentación innecesarios', () => {
      const unnecessaryDocs = [
        '../../CELEBRACION_FINAL_MISION_CUMPLIDA.md',
        '../../DIAGNOSTICO_PROBLEMA.md',
        '../../REPORTE_FINAL_CORRECCIONES.md'
      ];
      
      unnecessaryDocs.forEach(file => {
        const filePath = path.join(__dirname, file);
        expect(fs.existsSync(filePath)).toBe(false);
      });
    });

    test('❌ No deben existir configuraciones Jest duplicadas', () => {
      const duplicateJestConfigs = [
        'jest.config.complete.js',
        'jest.standalone.config.js'
      ];
      
      duplicateJestConfigs.forEach(file => {
        const filePath = path.join(__dirname, '../../', file);
        expect(fs.existsSync(filePath)).toBe(false);
      });
    });
  });
});
