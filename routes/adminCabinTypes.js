const express = require('express');
const router = express.Router();
const { 
  loadMenuCabinTypes, 
  getCabinTypeByKey,
  toggleCabinType,
  updateCabinType,
  createCabinType 
} = require('../services/menuCabinTypesService');

// GET /admin/cabin-types - Obtener todos los tipos de menú
router.get('/admin/cabin-types', async (req, res) => {
  try {
    const types = await loadMenuCabinTypes();
    res.json({
      success: true,
      data: types,
      total: types.length
    });
  } catch (error) {
    console.error('Error fetching cabin types:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tipos de cabañas',
      error: error.message
    });
  }
});

// GET /admin/cabin-types/:typeKey - Obtener un tipo específico
router.get('/admin/cabin-types/:typeKey', async (req, res) => {
  try {
    const { typeKey } = req.params;
    const type = await getCabinTypeByKey(typeKey);
    
    if (!type) {
      return res.status(404).json({
        success: false,
        message: 'Tipo de cabaña no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: type
    });
  } catch (error) {
    console.error('Error fetching cabin type:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tipo de cabaña',
      error: error.message
    });
  }
});

// PUT /admin/cabin-types/:typeKey - Actualizar un tipo
router.put('/admin/cabin-types/:typeKey', async (req, res) => {
  try {
    const { typeKey } = req.params;
    const updateData = req.body;
    
    // Validar datos requeridos
    if (updateData.capacidad && updateData.capacidad < 1) {
      return res.status(400).json({
        success: false,
        message: 'La capacidad debe ser mayor a 0'
      });
    }
    
    if (updateData.precio_noche && updateData.precio_noche < 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio debe ser mayor o igual a 0'
      });
    }
    
    const success = await updateCabinType(typeKey, updateData);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar tipo de cabaña'
      });
    }
    
    res.json({
      success: true,
      message: 'Tipo de cabaña actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error updating cabin type:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar tipo de cabaña',
      error: error.message
    });
  }
});

// PATCH /admin/cabin-types/:typeKey/toggle - Activar/desactivar tipo
router.patch('/admin/cabin-types/:typeKey/toggle', async (req, res) => {
  try {
    const { typeKey } = req.params;
    const { activo } = req.body;
    
    if (typeof activo !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'El campo "activo" debe ser true o false'
      });
    }
    
    const success = await toggleCabinType(typeKey, activo);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Error al cambiar estado del tipo'
      });
    }
    
    res.json({
      success: true,
      message: `Tipo de cabaña ${activo ? 'activado' : 'desactivado'} exitosamente`
    });
  } catch (error) {
    console.error('Error toggling cabin type:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado del tipo',
      error: error.message
    });
  }
});

// POST /admin/cabin-types - Crear nuevo tipo
router.post('/admin/cabin-types', async (req, res) => {
  try {
    const typeData = req.body;
    
    // Validar campos requeridos
    const requiredFields = ['type_key', 'nombre', 'tipo', 'capacidad', 'precio_noche'];
    const missingFields = requiredFields.filter(field => !typeData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Campos requeridos faltantes: ${missingFields.join(', ')}`
      });
    }
    
    // Validar datos
    if (typeData.capacidad < 1) {
      return res.status(400).json({
        success: false,
        message: 'La capacidad debe ser mayor a 0'
      });
    }
    
    if (typeData.precio_noche < 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio debe ser mayor o igual a 0'
      });
    }
    
    const success = await createCabinType(typeData);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Error al crear tipo de cabaña'
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Tipo de cabaña creado exitosamente'
    });
  } catch (error) {
    console.error('Error creating cabin type:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear tipo de cabaña',
      error: error.message
    });
  }
});

// GET /admin/cabin-types/preview/menu - Vista previa del menú
router.get('/admin/cabin-types/preview/menu', async (req, res) => {
  try {
    const types = await loadMenuCabinTypes();
    
    const menuPreview = types.map((type, index) => ({
      option: index + 1,
      text: `${index + 1}. ${type.nombre}`,
      details: {
        capacidad: `${type.capacidad} personas`,
        habitaciones: type.habitaciones,
        baños: type.baños,
        precio: `${type.moneda} ${type.precio_noche}`,
        fotos: type.fotos?.length || 0
      }
    }));
    
    res.json({
      success: true,
      menu: menuPreview,
      totalOptions: menuPreview.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating menu preview:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar vista previa del menú',
      error: error.message
    });
  }
});

module.exports = router;
