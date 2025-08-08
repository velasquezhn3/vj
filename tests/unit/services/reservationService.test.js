/**
 * Tests unitarios para reservationService  
 * Cobertura: Creación, validación, búsqueda, actualización de reservas
 */

const reservationService = require('../../../services/reservationService');
const { runQuery, runExecute } = require('../../../db');

// Mock dependencies
jest.mock('../../../db');

describe('📅 ReservationService - Tests Unitarios', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReservation', () => {
    test('✅ Debe crear reserva válida correctamente', async () => {
      // Arrange
      const reservationData = {
        user_id: 1,
        cabin_id: 2,
        start_date: '2025-08-15',
        end_date: '2025-08-17',
        number_of_people: 4,
        total_price: 500.00,
        status: 'pending'
      };

      runExecute.mockResolvedValue({ insertId: 123 });
      runQuery.mockResolvedValue([{ id: 123, ...reservationData }]);

      // Act
      const result = await reservationService.createReservation(reservationData);

      // Assert
      expect(result).toBeTruthy();
      expect(result.id).toBe(123);
      expect(runExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO Reservations'),
        expect.arrayContaining([1, 2, '2025-08-15', '2025-08-17', 4, 500.00, 'pending'])
      );
    });

    test('❌ Debe fallar con datos inválidos', async () => {
      // Arrange
      const invalidData = {
        user_id: null,
        cabin_id: 'invalid',
        start_date: 'invalid-date',
        number_of_people: -1
      };

      // Act & Assert
      await expect(reservationService.createReservation(invalidData))
        .rejects.toThrow();
    });

    test('⚠️ Debe manejar conflictos de fechas', async () => {
      // Arrange
      const reservationData = {
        user_id: 1,
        cabin_id: 2,
        start_date: '2025-08-15',
        end_date: '2025-08-17',
        number_of_people: 4
      };

      // Mock existing reservation conflict
      runQuery.mockResolvedValue([{
        id: 999,
        cabin_id: 2,
        start_date: '2025-08-16',
        end_date: '2025-08-18'
      }]);

      // Act & Assert
      await expect(reservationService.createReservation(reservationData))
        .rejects.toThrow('Cabaña no disponible en las fechas solicitadas');
    });
  });

  describe('findAvailableCabins', () => {
    test('✅ Debe encontrar cabañas disponibles', async () => {
      // Arrange
      const startDate = '2025-08-15';
      const endDate = '2025-08-17';
      const guestCount = 4;

      const mockCabins = [
        { id: 1, name: 'Cabaña Bosque', capacity: 6, price: 200 },
        { id: 2, name: 'Cabaña Lago', capacity: 4, price: 250 }
      ];

      runQuery.mockResolvedValue(mockCabins);

      // Act
      const result = await reservationService.findAvailableCabins(startDate, endDate, guestCount);

      // Assert
      expect(result).toEqual(mockCabins);
      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.* FROM Cabins c'),
        [startDate, endDate, guestCount]
      );
    });

    test('❌ Debe retornar array vacío si no hay disponibilidad', async () => {
      // Arrange
      runQuery.mockResolvedValue([]);

      // Act
      const result = await reservationService.findAvailableCabins('2025-12-24', '2025-12-26', 2);

      // Assert
      expect(result).toEqual([]);
    });

    test('⚠️ Debe validar parámetros de entrada', async () => {
      // Act & Assert
      await expect(reservationService.findAvailableCabins(null, '2025-08-17', 4))
        .rejects.toThrow('Start date is required');
      
      await expect(reservationService.findAvailableCabins('2025-08-15', null, 4))
        .rejects.toThrow('End date is required');
      
      await expect(reservationService.findAvailableCabins('2025-08-15', '2025-08-17', 0))
        .rejects.toThrow('Guest count must be positive');
    });
  });

  describe('validateReservationDates', () => {
    test('✅ Debe validar fechas válidas', () => {
      const validCases = [
        { start: '2025-08-15', end: '2025-08-17' },
        { start: '2025-12-01', end: '2025-12-03' },
        { start: '2026-01-01', end: '2026-01-02' }
      ];

      validCases.forEach(({ start, end }) => {
        expect(() => reservationService.validateReservationDates(start, end)).not.toThrow();
      });
    });

    test('❌ Debe rechazar fechas inválidas', () => {
      const invalidCases = [
        { start: '2025-08-17', end: '2025-08-15', error: 'End date must be after start date' },
        { start: '2025-08-15', end: '2025-08-15', error: 'Minimum stay is 1 night' },
        { start: '2025-07-01', end: '2025-07-02', error: 'Cannot make reservations in the past' },
        { start: 'invalid', end: '2025-08-17', error: 'Invalid start date format' },
        { start: '2025-08-15', end: 'invalid', error: 'Invalid end date format' }
      ];

      invalidCases.forEach(({ start, end, error }) => {
        expect(() => reservationService.validateReservationDates(start, end)).toThrow(error);
      });
    });

    test('⚠️ Debe manejar límites de reserva', () => {
      const today = new Date().toISOString().split('T')[0];
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 2);
      const twoYearsLater = oneYearLater.toISOString().split('T')[0];

      expect(() => reservationService.validateReservationDates(today, twoYearsLater))
        .toThrow('Reservation cannot be more than 1 year in advance');
    });
  });

  describe('calculateTotalPrice', () => {
    test('✅ Debe calcular precio total correctamente', () => {
      const testCases = [
        { pricePerNight: 200, nights: 2, expected: 400 },
        { pricePerNight: 150, nights: 3, expected: 450 },
        { pricePerNight: 300, nights: 1, expected: 300 }
      ];

      testCases.forEach(({ pricePerNight, nights, expected }) => {
        const result = reservationService.calculateTotalPrice(pricePerNight, nights);
        expect(result).toBe(expected);
      });
    });

    test('⚠️ Debe aplicar descuentos por estancia larga', () => {
      // Arrange - Más de 7 noches = 10% descuento
      const pricePerNight = 200;
      const nights = 10;
      
      // Act
      const result = reservationService.calculateTotalPrice(pricePerNight, nights);
      
      // Assert - 200 * 10 * 0.9 = 1800
      expect(result).toBe(1800);
    });

    test('❌ Debe validar parámetros de precio', () => {
      expect(() => reservationService.calculateTotalPrice(-100, 2))
        .toThrow('Price per night must be positive');
      
      expect(() => reservationService.calculateTotalPrice(200, 0))
        .toThrow('Number of nights must be positive');
    });
  });

  describe('getReservationsByStatus', () => {
    test('✅ Debe obtener reservas por estado', async () => {
      // Arrange
      const mockReservations = [
        { id: 1, status: 'confirmed', user_id: 1 },
        { id: 2, status: 'confirmed', user_id: 2 }
      ];
      runQuery.mockResolvedValue(mockReservations);

      // Act
      const result = await reservationService.getReservationsByStatus('confirmed');

      // Assert
      expect(result).toEqual(mockReservations);
      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = ?'),
        ['confirmed']
      );
    });

    test('⚠️ Debe manejar estados inválidos', async () => {
      await expect(reservationService.getReservationsByStatus('invalid_status'))
        .rejects.toThrow('Invalid reservation status');
    });
  });

  describe('updateReservationStatus', () => {
    test('✅ Debe actualizar estado de reserva', async () => {
      // Arrange
      runExecute.mockResolvedValue({ changes: 1 });

      // Act
      const result = await reservationService.updateReservationStatus(123, 'confirmed');

      // Assert
      expect(result).toBe(true);
      expect(runExecute).toHaveBeenCalledWith(
        'UPDATE Reservations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['confirmed', 123]
      );
    });

    test('❌ Debe fallar si la reserva no existe', async () => {
      // Arrange
      runExecute.mockResolvedValue({ changes: 0 });

      // Act
      const result = await reservationService.updateReservationStatus(999, 'confirmed');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getUpcomingReservations', () => {
    test('✅ Debe obtener reservas próximas', async () => {
      // Arrange
      const mockReservations = [
        { id: 1, start_date: '2025-08-10', user: 'Juan Pérez' },
        { id: 2, start_date: '2025-08-12', user: 'María García' }
      ];
      runQuery.mockResolvedValue(mockReservations);

      // Act
      const result = await reservationService.getUpcomingReservations(7); // próximos 7 días

      // Assert
      expect(result).toEqual(mockReservations);
      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE r.start_date BETWEEN'),
        expect.any(Array)
      );
    });
  });

  describe('cancelReservation', () => {
    test('✅ Debe cancelar reserva correctamente', async () => {
      // Arrange
      const mockReservation = {
        id: 123,
        status: 'confirmed',
        start_date: '2025-08-20' // Futuro
      };
      
      runQuery.mockResolvedValue([mockReservation]);
      runExecute.mockResolvedValue({ changes: 1 });

      // Act
      const result = await reservationService.cancelReservation(123, 'Usuario canceló');

      // Assert
      expect(result).toBe(true);
      expect(runExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE Reservations SET status = ?'),
        ['cancelled', expect.any(String), 123]
      );
    });

    test('❌ Debe rechazar cancelación de reserva pasada', async () => {
      // Arrange
      const mockReservation = {
        id: 123,
        status: 'confirmed',
        start_date: '2025-07-01' // Pasado
      };
      
      runQuery.mockResolvedValue([mockReservation]);

      // Act & Assert
      await expect(reservationService.cancelReservation(123, 'Late cancel'))
        .rejects.toThrow('Cannot cancel past reservations');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('⚠️ Debe manejar errores de base de datos', async () => {
      // Arrange
      runQuery.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(reservationService.findAvailableCabins('2025-08-15', '2025-08-17', 4))
        .rejects.toThrow('Database connection failed');
    });

    test('⚠️ Debe manejar datos de entrada maliciosos', async () => {
      const maliciousInputs = [
        "'; DROP TABLE Reservations; --",
        '<script>alert("xss")</script>',
        '../../etc/passwd'
      ];

      for (const input of maliciousInputs) {
        await expect(reservationService.findAvailableCabins(input, '2025-08-17', 4))
          .rejects.toThrow();
      }
    });

    test('⚠️ Debe validar límites de capacidad', () => {
      const extremeCases = [
        { guests: 0, shouldFail: true },
        { guests: -5, shouldFail: true },
        { guests: 1, shouldFail: false },
        { guests: 20, shouldFail: false },
        { guests: 100, shouldFail: true } // Límite máximo
      ];

      extremeCases.forEach(async ({ guests, shouldFail }) => {
        if (shouldFail) {
          await expect(reservationService.findAvailableCabins('2025-08-15', '2025-08-17', guests))
            .rejects.toThrow();
        }
      });
    });
  });
});
