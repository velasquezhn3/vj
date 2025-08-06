const express = require('express');
const router = express.Router();
const usersService = require('../services/usersService');

// GET /users - Listar todos los huéspedes
router.get('/', async (req, res) => {
  try {
    const users = await usersService.listUsers();
    res.json({ success: true, data: users });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error al listar usuarios' });
  }
});

// POST /users - Crear huésped
router.post('/', async (req, res) => {
  try {
    const { name, phone_number, role = 'guest', is_active = 1 } = req.body;
    if (!name || !phone_number) {
      return res.status(400).json({ success: false, message: 'Nombre y teléfono son obligatorios' });
    }
    const user_id = await usersService.createUser({ name, phone_number, role, is_active });
    if (user_id) {
      res.json({ success: true, user_id });
    } else {
      res.status(500).json({ success: false, message: 'No se pudo crear el usuario' });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error al crear usuario' });
  }
});

module.exports = router;
