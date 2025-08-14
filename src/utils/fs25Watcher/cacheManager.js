const fs = require("fs");

function cargarUltimoGuardado(cachePath) {
  try {
    if (fs.existsSync(cachePath)) {
      const content = fs.readFileSync(cachePath, "utf8");
      const json = JSON.parse(content);
      return json.lastSaveTime || 0;
    }
  } catch (err) {
    console.error(`❌ Error leyendo ${cachePath}:`, err.message);
  }
  return 0;
}

function guardarUltimoGuardado(cachePath, modTime) {
  try {
    fs.writeFileSync(cachePath, JSON.stringify({ lastSaveTime: modTime }, null, 2));
  } catch (err) {
    console.error(`❌ Error escribiendo ${cachePath}:`, err.message);
  }
}

function cargarCacheCompleto(cachePath) {
  try {
    if (fs.existsSync(cachePath)) {
      const content = fs.readFileSync(cachePath, "utf8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`❌ Error leyendo cache:`, err.message);
  }
  return null;
}

function guardarCacheCompleto(cachePath, modTime, data) {
  try {
    fs.writeFileSync(cachePath, JSON.stringify({
      lastSaveTime: modTime,
      cacheData: data
    }, null, 2));
  } catch (err) {
    console.error(`❌ Error guardando cache completo:`, err.message);
  }
}

module.exports = {
  cargarUltimoGuardado,
  guardarUltimoGuardado,
  cargarCacheCompleto,
  guardarCacheCompleto
};
