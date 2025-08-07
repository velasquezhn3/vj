const express = require('express');
const router = express.Router();
const { 
  loadMenuActivities, 
  getActivityByKey,
  toggleActivity,
  updateActivity,
  createActivity 
} = require('../services/menuActivitiesService');

// GET / - Obtener todas las actividades
router.get('/', async (req, res) => {
  try {
    const activities = await loadMenuActivities();
    res.json({
      success: true,
      data: activities,
      total: activities.length
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener actividades',
      error: error.message
    });
  }
});

// GET /:activityKey - Obtener una actividad específica
router.get('/:activityKey', async (req, res) => {
  try {
    const { activityKey } = req.params;
    const activity = await getActivityByKey(activityKey);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Actividad no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener actividad',
      error: error.message
    });
  }
});

// PUT /:activityKey - Actualizar una actividad
router.put('/:activityKey', async (req, res) => {
  try {
    const { activityKey } = req.params;
    const updateData = req.body;
    
    // Validar datos requeridos
    if (updateData.capacidad_maxima && updateData.capacidad_maxima < 1) {
      return res.status(400).json({
        success: false,
        message: 'La capacidad máxima debe ser mayor a 0'
      });
    }
    
    if (updateData.edad_minima && updateData.edad_minima < 0) {
      return res.status(400).json({
        success: false,
        message: 'La edad mínima debe ser mayor o igual a 0'
      });
    }
    
    // Validar precios si se proporcionan
    if (updateData.precios && updateData.precios.adulto && updateData.precios.adulto < 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio para adultos debe ser mayor o igual a 0'
      });
    }
    
    const success = await updateActivity(activityKey, updateData);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar actividad'
      });
    }
    
    res.json({
      success: true,
      message: 'Actividad actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar actividad',
      error: error.message
    });
  }
});

// PATCH /:activityKey/toggle - Activar/desactivar actividad
router.patch('/:activityKey/toggle', async (req, res) => {
  try {
    const { activityKey } = req.params;
    const { activo } = req.body;
    
    if (typeof activo !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'El campo "activo" debe ser true o false'
      });
    }
    
    const success = await toggleActivity(activityKey, activo);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Error al cambiar estado de la actividad'
      });
    }
    
    res.json({
      success: true,
      message: `Actividad ${activo ? 'activada' : 'desactivada'} exitosamente`
    });
  } catch (error) {
    console.error('Error toggling activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado de la actividad',
      error: error.message
    });
  }
});

// POST / - Crear nueva actividad
router.post('/', async (req, res) => {
  try {
    const activityData = req.body;
    
    // Validar campos requeridos
    const requiredFields = ['activity_key', 'nombre', 'categoria'];
    const missingFields = requiredFields.filter(field => !activityData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Campos requeridos faltantes: ${missingFields.join(', ')}`
      });
    }
    
    // Validar datos
    if (activityData.capacidad_maxima && activityData.capacidad_maxima < 1) {
      return res.status(400).json({
        success: false,
        message: 'La capacidad máxima debe ser mayor a 0'
      });
    }
    
    if (activityData.edad_minima && activityData.edad_minima < 0) {
      return res.status(400).json({
        success: false,
        message: 'La edad mínima debe ser mayor o igual a 0'
      });
    }
    
    const success = await createActivity(activityData);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Error al crear actividad'
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Actividad creada exitosamente'
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear actividad',
      error: error.message
    });
  }
});

// GET /preview/menu - Vista previa del menú de actividades
router.get('/preview/menu', async (req, res) => {
  try {
    const activities = await loadMenuActivities();
    
    const menuPreview = activities.map((activity, index) => ({
      option: index + 1,
      text: `${index + 1}. ${activity.nombre}`,
      details: {
        categoria: activity.categoria,
        subcategoria: activity.subcategoria,
        duracion: activity.duracion,
        capacidad: activity.capacidadMaxima ? `${activity.capacidadMaxima} personas` : 'No especificado',
        precio: activity.precios?.adulto ? `${activity.precios.moneda || 'HNL'} ${activity.precios.adulto}` : 'Consultar precio',
        ubicacion: activity.ubicacion?.direccion || 'No especificado',
        dificultad: activity.dificultad || 'No especificado'
      }
    }));
    
    res.json({
      success: true,
      menu: menuPreview,
      totalOptions: menuPreview.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating activities menu preview:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar vista previa del menú de actividades',
      error: error.message
    });
  }
});

// GET /menu/preview - Vista previa del menú dinámico para el bot
router.get('/menu/preview', async (req, res) => {
  try {
    const activities = await loadMenuActivities();
    
    // Filtrar solo las actividades activas que deben incluirse en el menú
    const menuActivities = activities.filter(activity => 
      activity.activo && activity.incluir_en_menu
    );
    
    // Ordenar por orden_menu
    menuActivities.sort((a, b) => (a.orden_menu || 99) - (b.orden_menu || 99));
    
    // Generar estructura del menú para el bot
    const menuStructure = {
      buttons: menuActivities.map((activity, index) => ({
        id: `activity_${activity.activity_key}`,
        text: activity.nombre,
        description: activity.descripcion?.substring(0, 60) + '...',
        callback_data: `activity:${activity.activity_key}`,
        order: index + 1
      })),
      quick_replies: menuActivities.map(activity => ({
        content_type: "text",
        title: activity.nombre,
        payload: `ACTIVITY_${activity.activity_key.toUpperCase()}`
      })),
      carousel: menuActivities.map(activity => {
        const firstPhoto = Array.isArray(activity.multimedia) && activity.multimedia.length > 0 
          ? activity.multimedia[0] 
          : null;
        
        return {
          title: activity.nombre,
          subtitle: activity.descripcion,
          image_url: typeof firstPhoto === 'string' ? firstPhoto : firstPhoto?.url || null,
          buttons: [
            {
              type: "postback",
              title: "Ver detalles",
              payload: `ACTIVITY_DETAILS_${activity.activity_key}`
            },
            {
              type: "web_url", 
              title: "Reservar",
              url: `${process.env.WEB_URL || 'https://villasjulie.com'}/reservar?activity=${activity.activity_key}`
            }
          ]
        };
      })
    };
    
    res.json({
      success: true,
      data: menuStructure,
      total: menuActivities.length,
      message: `Menú generado con ${menuActivities.length} actividades`
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
