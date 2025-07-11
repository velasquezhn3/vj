const fs = require('fs');
const path = require('path');

const loadActividades = () => {
  try {
    const dataPath = path.join(__dirname, '..', 'data', 'actividades.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const activities = JSON.parse(rawData);
    return activities;
  } catch (error) {
    console.error('Error loading activities from JSON:', error);
    return [];
  }
};

const createActivity = async (activity) => {
  try {
    const { name, description } = activity;
    const result = await db.runQuery(
      'INSERT INTO Activities (name, description) VALUES (?, ?)',
      [name, description]
    );
    return result.lastID;
  } catch (error) {
    console.error('Error creating activity:', error);
    return null;
  }
};

const updateActivity = async (id, activity) => {
  try {
    const { name, description } = activity;
    const result = await db.runQuery(
      'UPDATE Activities SET name = ?, description = ? WHERE activity_id = ?',
      [name, description, id]
    );
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating activity:', error);
    return false;
  }
};

const deleteActivity = async (id) => {
  try {
    const result = await db.runQuery(
      'DELETE FROM Activities WHERE activity_id = ?',
      [id]
    );
    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting activity:', error);
    return false;
  }
};

module.exports = {
  loadActividades,
  createActivity,
  updateActivity,
  deleteActivity,
};
