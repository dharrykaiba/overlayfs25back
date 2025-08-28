// src/services/modZipService.js
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const xml2js = require("xml2js");
const parser = new xml2js.Parser();

/**
 * Abre un ZIP y lo retorna. Si el archivo no existe o falla, devuelve null.
 */
function abrirZip(zipPath) {
  try {
    if (!fs.existsSync(zipPath)) return null;
    return new AdmZip(zipPath);
  } catch {
    return null;
  }
}

/**
 * Busca modDesc.xml dentro del ZIP, tolerando rutas y mayúsculas.
 */
function encontrarModDesc(zip) {
  if (!zip) return null;
  // 1) intento directo en raíz
  let entry = zip.getEntry("modDesc.xml");
  if (entry) return entry;

  // 2) búsqueda case-insensitive por todo el ZIP
  const lower = "moddesc.xml";
  entry = zip.getEntries().find(
    (e) => path.basename(e.entryName).toLowerCase() === lower
  );
  return entry || null;
}

/**
 * Parsea el modDesc.xml y retorna { desc, xmlData }.
 */
async function parsearModDesc(zip, entry) {
  const xmlData = zip.readAsText(entry);
  const parsed = await parser.parseStringPromise(xmlData);
  return { desc: parsed?.modDesc || {}, xmlData };
}

/**
 * Busca el <iconFilename> definido en el modDesc.
 */
function extraerIconFilename(desc) {
  let iconFile = null;

  // nivel raíz
  if (desc.iconFilename?.[0]) {
    iconFile = desc.iconFilename[0];
  }

  // dentro de <maps><map>
  if (!iconFile && desc.maps?.[0]?.map) {
    for (const map of desc.maps[0].map) {
      if (map.iconFilename?.[0]) {
        iconFile = map.iconFilename[0];
        break;
      }
    }
  }

  return iconFile ? String(iconFile).trim() : null;
}

module.exports = {
  abrirZip,
  encontrarModDesc,
  parsearModDesc,
  extraerIconFilename,
};
