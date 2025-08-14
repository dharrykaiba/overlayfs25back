//src/controllers/Mods.js
const { CareerSave } = require("../config/sequelize");

/**
 * GET /vehicle
 * Lista todos los mods de todos los savegames
 */
exports.allMods = async (req, res) => {
  try {
    const saves = await CareerSave.findAll();

    // Extraer y aplanar todos los mods de cada savegame
    const mods = saves.flatMap(save => {
      const extra = save.extra || {};
      return extra.mod || [];
    });

    res.json({ ok: true, mods });
  } catch (error) {
    console.error("❌ Error al obtener todos los mods:", error);
    res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
  }
};

/**
 * GET /vehicle/savegame/:modsSaveGameId
 * Lista los mods de un savegame específico
 */
exports.modsPorSavegame = async (req, res) => {
  const { modsSaveGameId } = req.params;

  try {
    const save = await CareerSave.findOne({
      where: { savegameId: modsSaveGameId }
    });

    if (!save) {
      return res.status(404).json({ ok: false, mensaje: "Savegame no encontrado" });
    }

    const mods = (save.extra && Array.isArray(save.extra.mod)) ? save.extra.mod : [];

    res.json({ ok: true, mods });
  } catch (error) {
    console.error(`❌ Error al obtener mods para savegame ${modsSaveGameId}:`, error);
    res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
  }
};

/**
 * GET /vehicle/:id
 * Obtiene un mod por ID de savegame + su posición en la lista
 */
exports.obtenerModsPorId = async (req, res) => {
  const { id } = req.params; // id podría ser el índice del mod

  try {
    // Buscar en todos los savegames por un mod que tenga ese ID interno (hash)
    const saves = await CareerSave.findAll();

    for (const save of saves) {
      const mods = save.extra?.mod || [];
      const encontrado = mods.find(m => m.fileHash === id || m.modName === id);
      if (encontrado) {
        return res.json({ ok: true, mod: encontrado });
      }
    }

    res.status(404).json({ ok: false, mensaje: "Mod no encontrado" });
  } catch (error) {
    console.error(`❌ Error al obtener mod con id ${id}:`, error);
    res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
  }
};
