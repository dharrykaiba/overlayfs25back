// src/services/imageService.js
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const { exec } = require("child_process");

// Subimos de backend/src a overlayapp y luego entramos a externos/i_view64.exe
const pathIrfanView = path.resolve(__dirname, "../../../externos/i_view64.exe");
// Usa la carpeta desde donde se ejecuta el .exe
const basePath = process.cwd();

const carpetaDestino = path.resolve(basePath, "imgconvert");
const carpetaConvertidos = path.join(carpetaDestino, "convert");
const extensionesPermitidas = [".dds", ".png", ".jpg", ".jpeg", ".webp"];

if (!fs.existsSync(carpetaDestino)) {
  fs.mkdirSync(carpetaDestino, { recursive: true });
}
if (!fs.existsSync(carpetaConvertidos)) {
  fs.mkdirSync(carpetaConvertidos, { recursive: true });
}
const webpExiste = (nombreDDS) => {
  const nombreBase = path.parse(nombreDDS).name + ".webp";
  const rutaWebp = path.join(carpetaConvertidos, nombreBase);
  return fs.existsSync(rutaWebp);
};

const copiarDDS = (rutaDDS, nombreNuevo = null) => {
  try {
    const nombreArchivo = nombreNuevo || path.basename(rutaDDS);

    // Verificar si el .webp ya existe
    if (webpExiste(nombreArchivo)) {
      return null;
    }

    const rutaDestino = path.join(carpetaDestino, nombreArchivo);
    fs.copyFileSync(rutaDDS, rutaDestino);
    return rutaDestino;
  } catch (err) {
    console.error("❌ Error al copiar imagen DDS:", err.message);
    return null;
  }
};

// Copiar imagen de un DLC listado en dlc.json (sin conversión)
const copiarImagenDLC = (rutaJson, dlc, carpetaDestinoWebp) => {
  try {
    if (!dlc.image) return null;

    const carpetaJson = path.dirname(rutaJson);
    const rutaImagen = path.join(carpetaJson, dlc.image);

    if (!fs.existsSync(rutaImagen)) {
      console.warn(`⚠️ Imagen de DLC no encontrada: ${rutaImagen}`);
      return null;
    }

    const nombreFinal = path.basename(dlc.image);
    const destino = path.join(carpetaDestinoWebp, nombreFinal);

    // ⚠️ Si ya existe, no sobrescribir
    if (fs.existsSync(destino)) {
      return destino;
    }

    fs.copyFileSync(rutaImagen, destino);
    console.log(`✅ Imagen DLC copiada: ${destino}`);
    return destino;
  } catch (err) {
    console.error("❌ Error al copiar imagen DLC:", err.message);
    return null;
  }
};

const extraerImagenDesdeZIP = (zipPath, imageName, nombreNuevo = null) => {
  try {
    const nombreFinal = nombreNuevo || imageName;

    // Calcular siempre la ruta del .webp
    const nombreBase = path.parse(nombreFinal).name + ".webp";
    const rutaWebp = path.join(carpetaConvertidos, nombreBase);
    // Verificar si el .webp ya existe
    if (webpExiste(nombreFinal)) {
      return rutaWebp;
    }

    const zip = new AdmZip(zipPath);
    // 🔹 Cambio aquí

    const nombreBaseBuscado = path.parse(imageName).name.toLowerCase();

    const imageEntry = zip.getEntries().find((entry) => {
      const entryParsed = path.parse(entry.entryName);
      const entryBase = entryParsed.name.toLowerCase();
      const entryExt = entryParsed.ext.toLowerCase();

      return (
        entryBase === nombreBaseBuscado &&
        extensionesPermitidas.includes(entryExt)
      );
    });
    // 🔹 Fin del cambio

    if (!imageEntry) {
      return null;
    }

    const destinoFinal = path.join(carpetaDestino, nombreFinal);

    // ⚠️ Si ya existe, no sobreescribir, solo devolver ruta
    if (fs.existsSync(destinoFinal)) {
      return destinoFinal;
    }

    fs.writeFileSync(destinoFinal, zip.readFile(imageEntry));
    return destinoFinal;
  } catch (err) {
    console.error("❌ Error al extraer imagen del ZIP:", err.message);
    return null;
  }
};

const convertirDDSaWEBP = async () => {
  return new Promise((resolve, reject) => {
    try {
      // 1. Leer todos los archivos en carpetaDestino
      const archivos = fs.readdirSync(carpetaDestino);

      // 2. Filtrar solo los que tengan extensión permitida
      const archivosPermitidos = archivos.filter((archivo) => {
        const ext = path.extname(archivo).toLowerCase();
        return extensionesPermitidas.includes(ext);
      });

      if (archivosPermitidos.length === 0) {
        console.log("ℹ️ No se encontraron archivos para convertir.");
        return resolve(true);
      }

      // 3. Ejecutar conversión de TODOS los formatos → WEBP con IrfanView
      const comando = `powershell -Command "& \\"${pathIrfanView}\\" \\"${carpetaDestino}\\*.*\\" /convert=\\"${carpetaConvertidos}\\*.webp\\""`;

      exec(comando, (error) => {
        if (error) {
          console.error("❌ Error al convertir a WEBP:", error.message);
          return reject(error);
        }

        console.log("✅ Conversión de imágenes a WEBP completada.");
        resolve(true);
      });
    } catch (err) {
      console.error("❌ Error general en convertirDDSaWEBP:", err.message);
      reject(err);
    }
  });
};

function eliminarDDSCopiados() {
  fs.readdir(carpetaDestino, (err, archivos) => {
    if (err) return;

    archivos.forEach((archivo) => {
      if (archivo.toLowerCase().endsWith(".dds")) {
        const rutaCompleta = path.join(carpetaDestino, archivo);
        fs.unlink(rutaCompleta, () => {});
      }
    });
  });
}

module.exports = {
  copiarDDS,
  extraerImagenDesdeZIP,
  convertirDDSaWEBP,
  eliminarDDSCopiados,
  copiarImagenDLC,
};
