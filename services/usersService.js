const db = require('../db');

const getUserByPhone = async (phone_number) => {
  try {
    const rows = await db.runQuery('SELECT * FROM Users WHERE phone_number = ?', [phone_number]);
    return rows.length > 0 ? rows[0] : null;
  } catch (e) {
    console.error('Error fetching user by phone:', e);
    return null;
  }
};

const createUser = async (userData) => {
  try {
    const sql = "INSERT INTO Users (phone_number, name, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))";
    const params = [
      userData.phone_number,
      userData.name || null,
      userData.role || 'guest',
      userData.is_active !== undefined ? userData.is_active : 1
    ];
    const result = await db.runExecute(sql, params);
    return result.lastID ? result.lastID : null;
  } catch (e) {
    console.error('Error creating user:', e);
    return null;
  }
};

const updateUser = async (user_id, updateData) => {
  try {
    const fields = [];
    const params = [];
    for (const key in updateData) {
      fields.push(key + ' = ?');
      params.push(updateData[key]);
    }
    params.push(user_id);
    const sql = 'UPDATE Users SET ' + fields.join(', ') + ', updated_at = datetime(\'now\') WHERE user_id = ?';
    const result = await db.runExecute(sql, params);
    return result.changes > 0;
  } catch (e) {
    console.error('Error updating user:', e);
    return false;
  }
};

const listUsers = async () => {
  try {
    const users = await db.runQuery('SELECT * FROM Users');
    return users;
  } catch (e) {
    console.error('Error listing users:', e);
    return [];
  }
};

module.exports = {
  getUserByPhone,
  createUser,
  updateUser,
  listUsers
};
