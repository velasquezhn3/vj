const fs = require('fs');
const path = require('path');

const cabanasFilePath = path.resolve(__dirname, '../data/cabañas.json');

function readCabanas() {
  const data = fs.readFileSync(cabanasFilePath, 'utf-8');
  return JSON.parse(data);
}

function writeCabanas(cabanas) {
  fs.writeFileSync(cabanasFilePath, JSON.stringify(cabanas, null, 2), 'utf-8');
}

exports.getAllCabanas = (req, res) => {
  try {
    const cabanas = readCabanas();
    // Map backend fields to frontend expected fields
    const mappedCabanas = cabanas.map(c => ({
      cabin_id: c.id,
      name: c.nombre,
      capacity: c.capacidad,
      price: c.precio_noche,
      description: c.descripcion,
      // Include other fields if needed
    }));
    res.json(mappedCabanas);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error leyendo las cabañas' });
  }
};

exports.createCabana = (req, res) => {
  try {
    const { name, capacity, price, description } = req.body;
    if (!name || !capacity || !price) {
      return res.status(400).json({ success: false, message: 'Campos obligatorios faltantes' });
    }
    const cabanas = readCabanas();
    // Generate new string ID like "cab4"
    const existingIds = cabanas.map(c => c.id);
    const numericIds = existingIds
      .map(id => parseInt(id.replace('cab', '')))
      .filter(num => !isNaN(num));
    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
    const newId = 'cab' + (maxId + 1);

    const newCabana = {
      id: newId,
      nombre: name,
      tipo: capacity + ' personas',
      capacidad: parseInt(capacity),
      habitaciones: 1,
      baños: 1,
      fotos: [],
      precio_noche: parseFloat(price),
      moneda: 'HNL',
      comodidades: [],
      ubicacion: {
        ciudad: '',
        departamento: ''
      },
      reservas: [],
      descripcion: description || ''
    };

    // Handle photo upload if exists
    if (req.file) {
      newCabana.fotos.push(req.file.filename);
    }

    cabanas.push(newCabana);
    writeCabanas(cabanas);
    res.json({ success: true, cabana: newCabana });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creando la cabaña' });
  }
};

exports.updateCabana = (req, res) => {
  try {
    const id = req.params.id; // Use string ID directly
    const { name, capacity, price, description } = req.body;
    const cabanas = readCabanas();
    const index = cabanas.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Cabaña no encontrada' });
    }
    if (name) cabanas[index].nombre = name;
    if (capacity) cabanas[index].capacidad = parseInt(capacity);
    if (price) cabanas[index].precio_noche = parseFloat(price); // Fix field name
    if (description !== undefined) cabanas[index].descripcion = description;

    // Handle photo upload if exists
    if (req.file) {
      cabanas[index].fotos.push(req.file.filename);
    }

    writeCabanas(cabanas);
    res.json({ success: true, cabana: cabanas[index] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error actualizando la cabaña' });
  }
};

exports.deleteCabana = (req, res) => {
  try {
    const id = req.params.id; // Use string ID directly
    let cabanas = readCabanas();
    const index = cabanas.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Cabaña no encontrada' });
    }
    cabanas = cabanas.filter(c => c.id !== id);
    writeCabanas(cabanas);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error eliminando la cabaña' });
  }
};
