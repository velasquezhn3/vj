const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'bot_database.sqlite');

console.log('Database path:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    
    // Test query
    db.all('SELECT COUNT(*) as count FROM Cabins', [], (err, rows) => {
      if (err) {
        console.error('Error querying database:', err);
      } else {
        console.log('Total cabins in database:', rows[0].count);
        
        // Get all cabins
        db.all('SELECT * FROM Cabins ORDER BY cabin_id', [], (err, rows) => {
          if (err) {
            console.error('Error getting cabins:', err);
          } else {
            console.log('All cabins:');
            rows.forEach(cabin => {
              console.log(`- ID: ${cabin.cabin_id}, Name: ${cabin.name}, Capacity: ${cabin.capacity}, Price: ${cabin.price}`);
            });
          }
          db.close();
        });
      }
    });
  }
});
