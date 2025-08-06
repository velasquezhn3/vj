/**
 * Configuración de Jest para tests independientes
 * Sin dependencias externas ni setup automático
 */

module.exports = {
    testEnvironment: 'node',
    
    // No cargar setup automáticamente
    setupFilesAfterEnv: [],
    
    // Solo ejecutar archivos específicos
    testMatch: ['**/standalone.test.js'],
    
    // No coverage para simplificar
    collectCoverage: false,
    
    // Verbose output
    verbose: true,
    
    // No cache para evitar problemas
    cache: false,
    
    // Transform
    transform: {},
    
    // Timeouts
    testTimeout: 10000,
    
    // Clear mocks
    clearMocks: true,
    
    // Root directory
    rootDir: '.',
    
    // Test path ignore patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/coverage/',
        '/dist/'
    ]
};
