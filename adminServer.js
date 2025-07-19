const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

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
app.use('/comprobantes', express.static(path.join(__dirname, 'public/comprobantes')));
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

const adminCabinsController = require('./controllers/adminCabinsController');

// Cabins routes
app.get('/admin/cabins', adminCabinsController.getAllCabanas);

app.post('/admin/cabins', upload.single('photo'), adminCabinsController.createCabana);

app.put('/admin/cabins/:id', upload.single('photo'), adminCabinsController.updateCabana);

app.delete('/admin/cabins/:id', adminCabinsController.deleteCabana);

const adminReservationsRoutes = require('./routes/adminReservations');

// Reservations routes
// Remove old routes and use new routes with file upload support
app.use(adminReservationsRoutes);

const conversationStatesService = require('./services/conversationStatesService');

const adminDashboardRoutes = require('./routes/adminDashboard');

app.use(adminDashboardRoutes);

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
