//src/utils/fs25Watcher.js
const fs = require("fs");
const path = require("path");
const { leersavexml } = require("../services/checkSaveFile");
const { leerXML } = require("../services/vehicleService");
const { eliminarDDSCopiados } = require("../services/imageService");
const { getIO } = require("../config/socket");

const basePath = "D:/Dharry/My Games/FarmingSimulator2025";
const gameDataPath = "E:/Games/Farming Simulator 25/";
const moddir = `${basePath}/mods`;

// Configuración de paths
const appRoot = process.cwd();
const cacheDir = path.join(appRoot, "cache");

// Crear la carpeta "cache" si no existe
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// Objeto para almacenar los datos en memoria
const savegamesCache = {};
let firstRun = true;

/**
 * Encuentra todos los directorios de savegames disponibles
 * @returns {Array} Lista de paths de savegames
 */
function encontrarSavegames() {
  const savegames = [];
  let i = 1;
  
  while (true) {
    const savePath = path.join(basePath, `savegame${i}`);
    if (fs.existsSync(savePath)) {
      savegames.push({
        path: savePath,
        number: i,
        vehiclesPath: path.join(savePath, "vehicles.xml"),
        metaPath: path.join(savePath, "careerSavegame.xml"),
        cachePath: path.join(cacheDir, `saveInfo_${i}.json`)
      });
      i++;
    } else {
      break;
    }
  }
  
  return savegames;
}

/**
 * Carga el último tiempo guardado desde el archivo JSON de cache
 * @param {string} cachePath - Ruta del archivo de cache
 * @returns {number} Tiempo de modificación guardado
 */
function cargarUltimoGuardado(cachePath) {
  try {
    if (fs.existsSync(cachePath)) {
      const content = fs.readFileSync(cachePath, "utf8");
      const json = JSON.parse(content);
      return json.lastSaveTime || 0;
    }
  } catch (err) {
    console.error(`❌ Error leyendo ${path.basename(cachePath)}:`, err.message);
  }
  return 0;
}

/**
 * Guarda el nuevo tiempo modificado en el archivo de cache
 * @param {string} cachePath - Ruta del archivo de cache
 * @param {number} modTime - Tiempo de modificación
 */
function guardarUltimoGuardado(cachePath, modTime) {
  try {
    const content = JSON.stringify({ lastSaveTime: modTime }, null, 2);
    fs.writeFileSync(cachePath, content);
  } catch (err) {
    console.error(`❌ Error escribiendo ${path.basename(cachePath)}:`, err.message);
  }
}

/**
 * Verifica si hubo cambios en el savegame
 * @param {Object} savegame - Objeto con información del savegame
 * @returns {boolean} True si hubo cambios
 */
function huboNuevoGuardado(savegame) {
  try {
    const stats = fs.statSync(savegame.metaPath);
    const modTime = stats.mtimeMs;
    const lastTime = cargarUltimoGuardado(savegame.cachePath);

    if (modTime !== lastTime) {
      guardarUltimoGuardado(savegame.cachePath, modTime);
      return true;
    }
  } catch (err) {
    console.error(`❌ Error al verificar guardado en savegame${savegame.number}:`, err.message);
  }
  return false;
}

/**
 * Carga los datos completos del cache desde disco
 * @param {Object} savegame - Objeto con información del savegame
 * @returns {Object|null} Datos del cache o null si no existe
 */
function cargarCacheCompleto(savegame) {
  try {
    if (fs.existsSync(savegame.cachePath)) {
      const content = fs.readFileSync(savegame.cachePath, "utf8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`❌ Error al leer cache completo para savegame${savegame.number}:`, err.message);
  }
  return null;
}

/**
 * Guarda los datos completos en el cache
 * @param {Object} savegame - Objeto con información del savegame
 * @param {number} modTime - Tiempo de modificación
 * @param {Object} data - Datos a guardar
 */
function guardarCacheCompleto(savegame, modTime, data) {
  try {
    const content = JSON.stringify(
      {
        lastSaveTime: modTime,
        cacheData: data,
      },
      null,
      2
    );
    fs.writeFileSync(savegame.cachePath, content, "utf8");
  } catch (err) {
    console.error(`❌ Error al guardar cache completo para savegame${savegame.number}:`, err.message);
  }
}

/**
 * Procesa un savegame específico
 * @param {Object} savegame - Objeto con información del savegame
 * @returns {Object} Objeto con resultados del procesamiento
 */
async function procesarSavegame(savegame) {
  const ahora = new Date().toLocaleString();
  const result = {
    number: savegame.number,
    status: 'unchanged',
    newVehicles: 0,
    message: ''
  };
  
  if (huboNuevoGuardado(savegame)) {
    result.status = 'updated';
    try {
      const infoSave = await leersavexml(savegame.path, savegame.number);
      const infoVehicles = await leerXML(savegame.vehiclesPath, gameDataPath, moddir, savegame.number);

      // Comparar con datos previos
      const nuevosVehiculos = [];
      const oldIDs = new Set(savegamesCache[savegame.number]?.vehicles?.map((v) => v.id));

      for (const v of infoVehicles) {
        if (!oldIDs || !oldIDs.has(v.id)) {
          nuevosVehiculos.push(v);
        }
      }

      // Actualizar cache en memoria
      savegamesCache[savegame.number] = {
        saveInfo: infoSave,
        vehicles: infoVehicles,
      };

      const stats = fs.statSync(savegame.metaPath);
      guardarCacheCompleto(savegame, stats.mtimeMs, savegamesCache[savegame.number]);

      result.newVehicles = nuevosVehiculos.length;
      result.message = `🔄 [${ahora}] Savegame${savegame.number} actualizado. Nuevos vehículos: ${nuevosVehiculos.length}`;

      // Emitir eventos WebSocket para nuevos vehículos
      const io = getIO();
      nuevosVehiculos.forEach((v) => {
        io.emit("vehiculo_agregado", v);
      });
    } catch (err) {
      result.status = 'error';
      result.message = `❌ Error al cargar XMLs para savegame${savegame.number}: ${err.message}`;
    }
  } else if (!savegamesCache[savegame.number]) {
    // Primera carga, intenta leer desde disco
    const data = cargarCacheCompleto(savegame);
    if (data) {
      savegamesCache[savegame.number] = data.cacheData || data;
      result.status = 'loaded';
      result.message = `📦 [${ahora}] Cache cargado para savegame${savegame.number} desde archivo.`;
    } else {
      // Si no hay cache, lo fuerza manualmente
      try {
        const infoSave = await leersavexml(savegame.path);
        const infoVehicles = await leerXML(savegame.vehiclesPath, gameDataPath, moddir,savegame.number);

        savegamesCache[savegame.number] = {
          saveInfo: infoSave,
          vehicles: infoVehicles,
        };

        const stats = fs.statSync(savegame.metaPath);
        guardarCacheCompleto(savegame, stats.mtimeMs, savegamesCache[savegame.number]);

        result.status = 'forced';
        result.message = `✅ Datos forzadamente cargados para savegame${savegame.number}.`;
      } catch (err) {
        result.status = 'error';
        result.message = `❌ Error forzando carga inicial para savegame${savegame.number}: ${err.message}`;
      }
    }
  }
  
  return result;
}

/**
 * Carga los datos de todos los savegames disponibles
 */
async function cargarDatosXML() {
  const savegames = encontrarSavegames();
  
  if (savegames.length === 0) {
    console.log("⚠️ No se encontraron savegames en el directorio base.");
    return;
  }

  if (firstRun) {
    console.log(`🔍 Encontrados ${savegames.length} savegames:`);
    savegames.forEach(sg => console.log(` - savegame${sg.number}`));
    firstRun = false;
  }

  // Procesar cada savegame en paralelo
  const results = await Promise.all(savegames.map(procesarSavegame));

  // 👇 Mover la limpieza aquí, después de todo el procesamiento
    //eliminarDDSCopiados();

  // Mostrar resumen de resultados
  const ahora = new Date().toLocaleString();
  let hasChanges = false;
  
  results.forEach(result => {
    if (result.status !== 'unchanged' && result.message) {
      console.log(result.message);
      hasChanges = true;
    }
  });

  if (!hasChanges) {
    const unchangedSavegames = results.map(r => r.number).join(', ');
    console.log(`🕒 [${ahora}] Sin cambios en savegames: ${unchangedSavegames}`);
  }

  // Mostrar uso de memoria solo si hay cambios o es la primera ejecución
  if (hasChanges || firstRun) {
    const used = process.memoryUsage();
    console.log(`📊 Memoria usada: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);
  }
}

module.exports = {
  cargarDatosXML,
  savegamesCache,
};