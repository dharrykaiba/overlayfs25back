//src/routes/vehicleRoutes.js
const express = require("express");
const router = express.Router();
const vehicleController = require("../controllers/Vehiculo");

// Ruta para obtener todos los vehículos
router.get("/", vehicleController.allVehiculos);

// Ruta para obtener vehículos por savegameId
router.get("/savegame/:savegameId", vehicleController.vehiculosPorSavegame);

// Ruta para guardar o actualizar un vehículo
router.post("/guardar", vehicleController.guardarVehiculo);

// Ruta para obtener un vehículo por ID
router.get("/:id", vehicleController.obtenerVehiculoPorId);

module.exports = router;
