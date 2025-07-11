const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const usersService = require('./services/usersService');
const alojamientosService = require('./services/alojamientosService');
const actividadesService = require('./services/actividadesService');

const app = express();
const PORT = 4000;

app.use(cors());  // Add CORS middleware to allow cross-origin requests

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files for simple frontend UI
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Users routes
app.get('/admin/users', async (req, res) => {
  const users = await usersService.listUsers();
  res.json(users);
});

app.post('/admin/users', async (req, res) => {
  const userId = await usersService.createUser(req.body);
  res.json({ success: !!userId, userId });
});

app.put('/admin/users/:id', async (req, res) => {
  const success = await usersService.updateUser(parseInt(req.params.id), req.body);
  res.json({ success });
});

// Cabins routes
app.get('/admin/cabins', async (req, res) => {
  const cabins = await alojamientosService.loadCabañas();
  res.json(cabins);
});

app.post('/admin/cabins', async (req, res) => {
  const cabinData = req.body;
  // For simplicity, assume cabins are added directly to DB (implement if needed)
  res.json({ success: false, message: 'Create cabin not implemented yet' });
});

app.put('/admin/cabins/:id', async (req, res) => {
  const cabinId = parseInt(req.params.id);
  const cabinData = req.body;
  const success = await alojamientosService.updateCabin(cabinId, cabinData);
  res.json({ success });
});

app.delete('/admin/cabins/:id', async (req, res) => {
  const cabinId = parseInt(req.params.id);
  const success = await alojamientosService.deleteCabin(cabinId);
  res.json({ success });
});

// Reservations routes
app.get('/admin/reservations', async (req, res) => {
  const reservations = await alojamientosService.loadReservations();
  res.json(reservations);
});

app.post('/admin/reservations', async (req, res) => {
  const { cabin_id, user_id, start_date, end_date, status, total_price } = req.body;
  const success = await alojamientosService.addReserva(cabin_id, user_id, { start_date, end_date, status, total_price });
  res.json({ success });
});

app.put('/admin/reservations/:id', async (req, res) => {
  const reservationId = parseInt(req.params.id);
  const reservationData = req.body;
  const success = await alojamientosService.updateReservation(reservationId, reservationData);
  res.json({ success });
});

app.delete('/admin/reservations/:id', async (req, res) => {
  const reservationId = parseInt(req.params.id);
  const success = await alojamientosService.deleteReservation(reservationId);
  res.json({ success });
});

const conversationStatesService = require('./services/conversationStatesService');

// Activities routes
const fs = require('fs');

app.get('/admin/activities', async (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'data', 'actividades.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const activities = JSON.parse(rawData);
    res.json(activities);
  } catch (error) {
    console.error('Error reading activities JSON:', error);
    res.status(500).json({ error: 'Failed to load activities' });
  }
});

app.post('/admin/activities', async (req, res) => {
  const activity = req.body;
  const newId = await actividadesService.createActivity(activity);
  if (newId) {
    res.json({ success: true, activityId: newId });
  } else {
    res.json({ success: false, message: 'Failed to create activity' });
  }
});

app.put('/admin/activities/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const activity = req.body;
  const success = await actividadesService.updateActivity(id, activity);
  if (success) {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'Failed to update activity' });
  }
});

app.delete('/admin/activities/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const success = await actividadesService.deleteActivity(id);
  if (success) {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'Failed to delete activity' });
  }
});

// Conversation States routes
app.get('/admin/conversation-states', async (req, res) => {
  const states = await conversationStatesService.getAllStates();
  res.json(states);
});

app.post('/admin/conversation-states', async (req, res) => {
  const success = await conversationStatesService.createState(req.body);
  res.json({ success });
});

app.put('/admin/conversation-states/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const success = await conversationStatesService.updateState(id, req.body);
  res.json({ success });
});

app.delete('/admin/conversation-states/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const success = await conversationStatesService.deleteState(id);
  res.json({ success });
});

app.listen(PORT, () => {
  console.log(`Admin server running at http://localhost:${PORT}`);
});
