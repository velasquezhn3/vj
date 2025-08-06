/**
 * Tests del Bot WhatsApp
 * Bot VJ - Sistema de Reservas Villas Julie
 */

const BotController = require('../../controllers/botController');
const { runQuery, runExecute } = require('../../db');

describe('🤖 Bot WhatsApp Integration Tests', () => {
  let testUserId;
  let botInstance;

  beforeAll(async () => {
    // Crear usuario de prueba
    const userResult = await runExecute(`
      INSERT INTO Users (phone_number, name, role) 
      VALUES ('+573009876543', 'Bot Test User', 'cliente')
    `);
    testUserId = userResult.lastID;
    
    // Inicializar bot para tests (sin conexión real)
    botInstance = new BotController();
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await runExecute('DELETE FROM Users WHERE phone_number = ?', ['+573009876543']);
    await runExecute('DELETE FROM ConversationStates WHERE user_id = ?', [testUserId]);
  });

  describe('💬 Message Processing', () => {
    test('Should handle greeting messages', async () => {
      const mockMessage = {
        key: { remoteJid: '+573009876543@s.whatsapp.net' },
        message: { conversation: 'Hola' },
        messageTimestamp: Date.now()
      };

      // Mock del procesamiento (sin envío real)
      const mockSock = {
        sendMessage: jest.fn().mockResolvedValue({})
      };

      // Simular procesamiento del mensaje
      const response = await botInstance.processMessage(mockMessage, mockSock);
      
      expect(response).toBeDefined();
      expect(mockSock.sendMessage).toHaveBeenCalled();
    });

    test('Should handle reservation requests', async () => {
      const mockMessage = {
        key: { remoteJid: '+573009876543@s.whatsapp.net' },
        message: { conversation: 'Quiero hacer una reserva' },
        messageTimestamp: Date.now()
      };

      const mockSock = {
        sendMessage: jest.fn().mockResolvedValue({})
      };

      const response = await botInstance.processMessage(mockMessage, mockSock);
      
      expect(response).toBeDefined();
      expect(mockSock.sendMessage).toHaveBeenCalled();
    });

    test('Should handle cabin availability queries', async () => {
      const mockMessage = {
        key: { remoteJid: '+573009876543@s.whatsapp.net' },
        message: { conversation: 'Ver cabañas disponibles' },
        messageTimestamp: Date.now()
      };

      const mockSock = {
        sendMessage: jest.fn().mockResolvedValue({})
      };

      const response = await botInstance.processMessage(mockMessage, mockSock);
      
      expect(response).toBeDefined();
    });
  });

  describe('🗄️ Conversation State Management', () => {
    test('Should save conversation state', async () => {
      const phoneNumber = '+573009876543';
      const state = 'awaiting_dates';
      const data = { cabin_id: 1 };

      await botInstance.saveConversationState(phoneNumber, state, data);

      const savedState = await runQuery(
        'SELECT * FROM ConversationStates WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1',
        [testUserId]
      );

      expect(savedState.length).toBe(1);
      expect(savedState[0].state).toBe(state);
    });

    test('Should retrieve conversation state', async () => {
      const phoneNumber = '+573009876543';
      
      const state = await botInstance.getConversationState(phoneNumber);
      
      expect(state).toBeDefined();
      expect(state.state).toBe('awaiting_dates');
    });

    test('Should clear conversation state', async () => {
      const phoneNumber = '+573009876543';
      
      await botInstance.clearConversationState(phoneNumber);
      
      const state = await botInstance.getConversationState(phoneNumber);
      expect(state).toBeNull();
    });
  });

  describe('📊 Bot Performance Tests', () => {
    test('Message processing should be fast (< 2s)', async () => {
      const mockMessage = {
        key: { remoteJid: '+573009876543@s.whatsapp.net' },
        message: { conversation: 'Test rápido' },
        messageTimestamp: Date.now()
      };

      const mockSock = {
        sendMessage: jest.fn().mockResolvedValue({})
      };

      const start = Date.now();
      await botInstance.processMessage(mockMessage, mockSock);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });

    test('Should handle multiple concurrent messages', async () => {
      const mockSock = {
        sendMessage: jest.fn().mockResolvedValue({})
      };

      const messages = Array(5).fill().map((_, i) => ({
        key: { remoteJid: `+5730098765${40 + i}@s.whatsapp.net` },
        message: { conversation: `Test concurrent ${i}` },
        messageTimestamp: Date.now()
      }));

      const start = Date.now();
      const promises = messages.map(msg => 
        botInstance.processMessage(msg, mockSock)
      );
      
      await Promise.all(promises);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000);
      expect(mockSock.sendMessage).toHaveBeenCalledTimes(5);
    });
  });
});
