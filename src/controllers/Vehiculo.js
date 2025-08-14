//src/controllers/Vehiculo.js
const { Vehiculo } = require("../config/sequelize");
const { getIO } = require("../config/socket");

const guardarVehiculo = async (req, res) => {
  const {
    id,
    nombre,
    imagen,
    precioBase,
    antiguedadHoras,
    marca,
    categoria,
    fechaCompra,
    tipo,
    xmlFilename,
    extra,
  } = req.body;

  try {
    await Vehiculo.upsert({
      id,
      nombre,
      imagen,
      precioBase,
      antiguedadHoras,
      marca,
      categoria,
      fechaCompra,
      tipo,
      xmlFilename,
      extra,
    });

    // Emitir evento WebSocket solo si fue creado o actualizado con éxito
    const io = getIO();
    console.log("🚀 Emitiendo vehiculo_agregado:", { id, nombre, categoria });
    io.emit("vehiculo_agregado", {
      id,
      nombre,
      imagen,
      precioBase,
      antiguedadHoras,
      marca,
      categoria,
      fechaCompra,
      tipo,
      xmlFilename,
      extra,
    });

    res.json({ ok: true, message: "Vehículo guardado correctamente." });
  } catch (error) {
    console.error("Error al guardar vehículo:", error);
    res.status(500).json({ ok: false, error: "Error al guardar vehículo" });
  }
};

const obtenerVehiculoPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const vehiculo = await Vehiculo.findByPk(id);

    if (!vehiculo) {
      return res
        .status(404)
        .json({ ok: false, error: "Vehículo no encontrado" });
    }

    res.json({ ok: true, vehiculo });
  } catch (error) {
    console.error("Error al obtener vehículo:", error);
    res.status(500).json({ ok: false, error: "Error al obtener vehículo" });
  }
};

const allVehiculos = async (req, res) => {
  try {
    const vehiculos = await Vehiculo.findAll();
    res.json({ ok: true, vehiculos });
  } catch (error) {
    console.error("Error al listar vehículos:", error);
    res.status(500).json({ ok: false, error: "Error al listar vehículos" });
  }
};

// Nuevo controlador para filtrar por savegameId
const vehiculosPorSavegame = async (req, res) => {
  try {
    const { savegameId } = req.params;

    if (!savegameId) {
      return res.status(400).json({ ok: false, error: "Debe indicar el savegameId" });
    }

    const vehiculos = await Vehiculo.findAll({
      where: { savegameId }
    });

    res.json({ 
      ok: true, 
      totalVehiculos: vehiculos.length, // 📊 Conteo en el JSON
      vehiculos 
    });

  } catch (error) {
    res.status(500).json({ ok: false, error: "Error al listar vehículos por savegame" });
  }
};


module.exports = {
  guardarVehiculo,
  obtenerVehiculoPorId,
  allVehiculos,
  vehiculosPorSavegame,
};
