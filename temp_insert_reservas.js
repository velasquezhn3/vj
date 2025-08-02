const db = require('./db');

const reservas = [
  {
    user_id: 1,
    cabin_id: 1, // Cabaña Tortuga 1
    start_date: '2025-08-05',
    end_date: '2025-08-08',
    status: 'confirmado',
    total_price: 4500,
    personas: 2
  },
  {
    user_id: 2,
    cabin_id: 4, // Cabaña Delfín 1
    start_date: '2025-08-15',
    end_date: '2025-08-18',
    status: 'confirmado',
    total_price: 13500,
    personas: 4
  }
];

async function insertReservas() {
  try {
    for (const reserva of reservas) {
      await db.runExecute(
        'INSERT INTO Reservations (user_id, cabin_id, start_date, end_date, status, total_price, personas, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))',
        [reserva.user_id, reserva.cabin_id, reserva.start_date, reserva.end_date, reserva.status, reserva.total_price, reserva.personas]
      );
    }
    console.log('Reservas de prueba creadas exitosamente');
    
    // Verificar las reservas
    const result = await db.runQuery('SELECT * FROM Reservations WHERE strftime("%Y-%m", start_date) = "2025-08"');
    console.log('Reservas en agosto:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

insertReservas();
