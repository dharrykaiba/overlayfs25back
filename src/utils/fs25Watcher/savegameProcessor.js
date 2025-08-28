//src/utils/fs25Watcher.js
const fs = require("fs");
const { leersavexml } = require("../../services/checkSaveFile");
const { leerXML } = require("../../services/vehicleService");
const {
  convertirDDSaWEBP,
  eliminarDDSCopiados,
} = require("../../services/imageService");

const {
  procesarModZip,
  mostrarResumen,
  resetResumen,
} = require("../../services/modService");
const { getIO } = require("../../config/socket");
const {
  cargarUltimoGuardado,
  guardarUltimoGuardado,
  cargarCacheCompleto,
  guardarCacheCompleto,
} = require("./cacheManager");
const { gameDataPath, moddir } = require("./paths");

const savegamesCache = {};

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
    console.error(
      `❌ Error verificando savegame${savegame.number}:`,
      err.message
    );
  }
  return false;
}

async function procesarSavegame(savegame) {
  const ahora = new Date().toLocaleString();
  const result = {
    number: savegame.number,
    status: "unchanged",
    newVehicles: 0,
    message: "",
  };

  if (huboNuevoGuardado(savegame)) {
    result.status = "updated";
    try {
      const infoSave = await leersavexml(savegame.path, savegame.number);
      //console.log("🔎 Mods del savegame:", infoSave.mods);

      const infoVehicles = await leerXML(
        savegame.vehiclesPath,
        gameDataPath,
        moddir,
        savegame.number
      );

      const oldIDs = new Set(
        savegamesCache[savegame.number]?.vehicles?.map((v) => v.id)
      );
      const nuevosVehiculos = infoVehicles.filter((v) => !oldIDs.has(v.id));
      // ⬇️ Nuevo paso: escanear mods ZIP y ampliar info en la tabla Mods----------------------------------
      if (infoSave && infoSave.mods) {
        resetResumen(); // 🔄 Resetea el resumen al empezar cada savegame
        for (const mod of infoSave.mods) {
          if (mod.modName) {
            await procesarModZip(mod.modName, moddir);
          } else {
            console.warn("   ⚠️ Este mod no tiene modName:", mod);
          }
        }
        mostrarResumen(savegame.number);
        resetResumen(); // 👈 limpiar inmediatamente después
      } else {
        console.warn("⚠️ infoSave.mods no existe o está vacío:", infoSave);
      }

      // 🖼️ ✅ Aquí convertimos TODOS los DDS → WEBP de una sola vez
      await convertirDDSaWEBP();
      //eliminarDDSCopiados(); // opcional: limpiar los temporales

      savegamesCache[savegame.number] = {
        saveInfo: infoSave,
        vehicles: infoVehicles,
      };

      const stats = fs.statSync(savegame.metaPath);
      guardarCacheCompleto(
        savegame.cachePath,
        stats.mtimeMs,
        savegamesCache[savegame.number]
      );

      result.newVehicles = nuevosVehiculos.length;
      result.message = `🔄 [${ahora}] Savegame${savegame.number} actualizado. Nuevos vehículos: ${nuevosVehiculos.length}`;

      const io = getIO();
      nuevosVehiculos.forEach((v) => io.emit("vehiculo_agregado", v));
    } catch (err) {
      result.status = "error";
      result.message = `❌ Error cargando XMLs para savegame${savegame.number}: ${err.message}`;
    }
  } else if (!savegamesCache[savegame.number]) {
    const data = cargarCacheCompleto(savegame.cachePath);
    if (data) {
      savegamesCache[savegame.number] = data.cacheData || data;
      result.status = "loaded";
      result.message = `📦 [${ahora}] Cache cargado para savegame${savegame.number}.`;
    }
  }

  return result;
}

module.exports = { procesarSavegame };
