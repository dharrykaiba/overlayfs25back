// src/controllers/fs25Routes.js
const { leerXML } = require("../services/vehicleService");

// Variables desde .env
const gameInstallPath = process.env.GAME_INSTALL_PATH;
const gameUserPath = process.env.GAME_USER_PATH;
const savegameSlot = process.env.SAVEGAME_SLOT; // ahora configurable

// Rutas
const savegamePath = `${gameUserPath}/savegame${savegameSlot}`;
const filePath = `${savegamePath}/vehicles.xml`;
//const careerPath = `${savegamePath}/careerSavegame.xml`;
const moddir = `${gameUserPath}/mods`;

// Cache
let cacheData = null;
//let cacheCarrera = null;


/*exports.obtenerCarrera = async (req, res) => {
  if (!cacheCarrera) {
    try {
      // Aquí eventualmente se llamará leerCareerXML(...) pero aún no se ejecuta
      // cacheCarrera = await leerCareerXML(careerPath);

      // Mensaje temporal para verificar que el endpoint funciona
      cacheCarrera = { mensaje: "Preparado para leer careerSavegame.xml" };
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Error al preparar lectura de careerSavegame.xml" });
    }
  }
  res.json(cacheCarrera);
};*/

// Endpoint para obtener los datos XML
exports.obtenerXML = async (req, res) => {
  if (!cacheData) {
    try {
      cacheData = await leerXML(filePath, gameDataPath, moddir);
    } catch (error) {
      return res.status(500).json({ error: "Error al leer XML" });
    }
  }
  //console.log("📤 Datos enviados por API:", cacheData); // 👈 Agrega esto si deseas
  res.json(cacheData);
};

// Inicializar la carga de datos
//cargarDatosXML();
