//src/routes/modsRoutes.js
const express = require("express");
const router = express.Router();
const modsController = require("../controllers/Mods");

// Ruta para obtener todos los mods
router.get("/", modsController.allMods);

// Ruta para obtener mods por savegameId
router.get("/savegame/:modsSaveGameId", modsController.modsPorSavegame);

// Ruta para obtener un mod por ID (puede ser modName o fileHash)
router.get("/name/:modName", modsController.obtenerModsPorName);

module.exports = router;
