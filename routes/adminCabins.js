const express = require('express');
const router = express.Router();
const adminCabinsController = require('../controllers/adminCabinsController');

router.get('/cabins', adminCabinsController.getAllCabanas);
router.post('/cabins', adminCabinsController.createCabana);
router.put('/cabins/:id', adminCabinsController.updateCabana);
router.delete('/cabins/:id', adminCabinsController.deleteCabana);

module.exports = router;
