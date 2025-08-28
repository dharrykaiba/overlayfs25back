//src/controllers/Mods.js
const { Mods } = require("../config/sequelize");

/**
 * Lista todos los mods de todos los savegames
 */
exports.allMods = async (req, res) => {
  try {
    const mods = await Mods.findAll(); // trae todos los mods directamente
    res.json({ ok: true, mods });
  } catch (error) {
    console.error("❌ Error al obtener todos los mods:", error.message);
    res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
  }
};

/**
 * Lista los mods de un savegame específico
 */
exports.modsPorSavegame = async (req, res) => {
  const { modsSaveGameId } = req.params;

  try {
    // Convertimos a string de 3 dígitos
    const saveSlot = modsSaveGameId.toString().padStart(3, "0");

    // Traemos todos los mods
    const allMods = await Mods.findAll();

    // Filtramos en memoria porque SQLite no soporta JSON.contains
    const mods = allMods.filter((m) => {
      const saves = m.savegames || [];
      return Array.isArray(saves) && saves.includes(saveSlot);
    });

    if (mods.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: `No se encontraron mods para el savegame ${saveSlot}`,
      });
    }

    res.json({ ok: true, mods });
  } catch (error) {
    console.error(`❌ Error al obtener mods para savegame ${modsSaveGameId}:`, error.message);
    res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
  }
};

/**
 * Busca un mod por su nombre exacto (modName)
 */
exports.obtenerModsPorName = async (req, res) => {
  const { modName } = req.params;

  try {
    // Buscar en la base de datos por modName
    const mod = await Mods.findOne({ where: { modName } });

    if (!mod) {
      return res.status(404).json({
        ok: false,
        mensaje: `No se encontró un mod con el nombre "${modName}"`,
      });
    }

    res.json({ ok: true, mod });
  } catch (error) {
    console.error(`❌ Error al obtener mod con nombre ${modName}:`, error.message);
    res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
  }
};
