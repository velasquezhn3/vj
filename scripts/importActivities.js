const fs = require('fs');
const path = require('path');
const db = require('../db');

const importActivities = async () => {
  try {
    const dataPath = path.join(__dirname, '../data/actividades.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const activities = JSON.parse(rawData);

    for (const activity of activities) {
      const { id, nombre, descripcion } = activity;
      // Map JSON fields to DB columns
      const activityId = id.replace('act', '') || null; // Extract numeric part from id like 'act1' -> '1'
      const name = nombre || '';
      const description = descripcion || '';
      // Insert into Activities table
      const query = "INSERT OR REPLACE INTO Activities (activity_id, name, description) VALUES (?, ?, ?)";
      await db.runQuery(query, [activityId, name, description]);
      console.log("Inserted activity: " + name);
    }
    console.log('Activities import completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error importing activities:', error);
    process.exit(1);
  }
};

importActivities();
