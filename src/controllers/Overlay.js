const { Overlay } = require("../config/sequelize");

const guardarOverlay = async (req, res) => {
  const { id, resolucion, texto, extra } = req.body;
  try {
    await Overlay.upsert({ id, resolucion, texto, extra });
    res.json({ ok: true, message: "Overlay guardado correctamente." });
  } catch (error) {
    console.error("Error al guardar overlay:", error);
    res.status(500).json({ ok: false, error: "Error al guardar overlay" });
  }
};

const obtenerOverlayPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const overlay = await Overlay.findByPk(id);
    if (!overlay) {
      return res
        .status(404)
        .json({ ok: false, error: "Overlay no encontrado" });
    }
    res.json({ ok: true, overlay });
  } catch (error) {
    console.error("Error al obtener overlay:", error);
    res.status(500).json({ ok: false, error: "Error al obtener overlay" });
  }
};

const allOverlay = async (req, res) => {
  try {
    const overlays = await Overlay.findAll();
    res.json({ ok: true, overlays });
  } catch (error) {
    console.error("Error al listar overlays:", error);
    res.status(500).json({ ok: false, error: "Error al listar overlays" });
  }
};

module.exports = {
  guardarOverlay,
  obtenerOverlayPorId,
  allOverlay,
};
