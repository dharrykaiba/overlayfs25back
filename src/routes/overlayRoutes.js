const express = require("express");
const router = express.Router();
const overlayController = require("../controllers/Overlay");

router.get("/", overlayController.allOverlay);
// Ruta para guardar o actualizar overlay
router.post("/guardar", overlayController.guardarOverlay);

// Ruta para obtener overlay por ID
router.get("/:id", overlayController.obtenerOverlayPorId);

module.exports = router;
