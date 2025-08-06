/**
 * 📋 LOGGER MEJORADO - Bot VJ
 * Sistema de logging categorizado con rotación automática
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.ensureLogDirectory();
        
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3,
            TRACE: 4
        };
        
        this.currentLevel = this.levels.INFO;
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.maxFiles = 5;
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, category, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            category,
            message,
            ...(data && { data })
        };
        
        return JSON.stringify(logEntry) + '\n';
    }

    writeToFile(filename, content) {
        const filePath = path.join(this.logDir, filename);
        
        try {
            // Verificar tamaño del archivo
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                if (stats.size > this.maxFileSize) {
                    this.rotateFile(filename);
                }
            }
            
            fs.appendFileSync(filePath, content);
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
    }

    rotateFile(filename) {
        const baseName = filename.replace('.log', '');
        
        // Mover archivos existentes
        for (let i = this.maxFiles - 1; i >= 1; i--) {
            const oldFile = path.join(this.logDir, `${baseName}.${i}.log`);
            const newFile = path.join(this.logDir, `${baseName}.${i + 1}.log`);
            
            if (fs.existsSync(oldFile)) {
                if (i === this.maxFiles - 1) {
                    fs.unlinkSync(oldFile); // Eliminar el más antiguo
                } else {
                    fs.renameSync(oldFile, newFile);
                }
            }
        }
        
        // Mover archivo actual
        const currentFile = path.join(this.logDir, filename);
        const rotatedFile = path.join(this.logDir, `${baseName}.1.log`);
        
        if (fs.existsSync(currentFile)) {
            fs.renameSync(currentFile, rotatedFile);
        }
    }

    log(level, category, message, data = null) {
        if (this.levels[level] <= this.currentLevel) {
            const formattedMessage = this.formatMessage(level, category, message, data);
            
            // Escribir a archivo específico por categoría
            const filename = `${category.toLowerCase()}.log`;
            this.writeToFile(filename, formattedMessage);
            
            // También escribir a archivo general
            this.writeToFile('app.log', formattedMessage);
            
            // Mostrar en consola para desarrollo
            if (process.env.NODE_ENV !== 'production') {
                const color = this.getConsoleColor(level);
                console.log(`${color}[${level}] ${category}: ${message}${data ? ` | Data: ${JSON.stringify(data)}` : ''}\x1b[0m`);
            }
        }
    }

    getConsoleColor(level) {
        const colors = {
            ERROR: '\x1b[31m',   // Rojo
            WARN: '\x1b[33m',    // Amarillo
            INFO: '\x1b[36m',    // Cian
            DEBUG: '\x1b[35m',   // Magenta
            TRACE: '\x1b[37m'    // Blanco
        };
        return colors[level] || '\x1b[0m';
    }

    // Métodos de conveniencia
    error(category, message, data = null) {
        this.log('ERROR', category, message, data);
    }

    warn(category, message, data = null) {
        this.log('WARN', category, message, data);
    }

    info(category, message, data = null) {
        this.log('INFO', category, message, data);
    }

    debug(category, message, data = null) {
        this.log('DEBUG', category, message, data);
    }

    trace(category, message, data = null) {
        this.log('TRACE', category, message, data);
    }

    // Métodos específicos por categoría
    database(level, message, data = null) {
        this.log(level, 'DATABASE', message, data);
    }

    api(level, message, data = null) {
        this.log(level, 'API', message, data);
    }

    bot(level, message, data = null) {
        this.log(level, 'BOT', message, data);
    }

    auth(level, message, data = null) {
        this.log(level, 'AUTH', message, data);
    }

    cache(level, message, data = null) {
        this.log(level, 'CACHE', message, data);
    }

    security(level, message, data = null) {
        this.log(level, 'SECURITY', message, data);
    }

    performance(level, message, data = null) {
        this.log(level, 'PERFORMANCE', message, data);
    }

    // Configuración dinámica
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.currentLevel = this.levels[level];
            this.info('LOGGER', `Log level set to ${level}`);
        }
    }

    // Cleanup de logs antiguos
    cleanup() {
        try {
            const files = fs.readdirSync(this.logDir);
            const now = Date.now();
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 días
            
            files.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    console.log(`Removed old log file: ${file}`);
                }
            });
        } catch (error) {
            console.error('Error during log cleanup:', error);
        }
    }

    // Obtener estadísticas de logs
    getStats() {
        try {
            const files = fs.readdirSync(this.logDir);
            const stats = {
                totalFiles: files.length,
                totalSize: 0,
                fileDetails: []
            };
            
            files.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const fileStats = fs.statSync(filePath);
                stats.totalSize += fileStats.size;
                stats.fileDetails.push({
                    name: file,
                    size: fileStats.size,
                    modified: fileStats.mtime
                });
            });
            
            return stats;
        } catch (error) {
            this.error('LOGGER', 'Error getting log stats', { error: error.message });
            return null;
        }
    }
}

// Crear instancia singleton
const logger = new Logger();

// Configurar cleanup automático cada 24 horas
setInterval(() => {
    logger.cleanup();
}, 24 * 60 * 60 * 1000);

module.exports = logger;
