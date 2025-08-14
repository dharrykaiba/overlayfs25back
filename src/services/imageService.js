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
      console.log(`✅ ${nombreArchivo} ya convertido. Se omite.`);
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

const extraerImagenDesdeZIP = (zipPath, imageName, nombreNuevo = null) => {
  try {
    const nombreFinal = nombreNuevo || imageName;

    // Verificar si el .webp ya existe
    if (webpExiste(nombreFinal)) {
      console.log(`✅ ${nombreFinal} ya convertido. Se omite.`);
      return null;
    }

    const zip = new AdmZip(zipPath);
    const imageEntry = zip
      .getEntries()
      .find(
        (entry) =>
          path.basename(entry.entryName).toLowerCase() ===
          imageName.toLowerCase()
      );

    if (!imageEntry) {
      return null;
    }

    const destinoFinal = path.join(carpetaDestino, nombreFinal);
    fs.writeFileSync(destinoFinal, zip.readFile(imageEntry));
    return destinoFinal;
  } catch (err) {
    console.error("❌ Error al extraer imagen del ZIP:", err.message);
    return null;
  }
};

const convertirDDSaWEBP = async () => {
  return new Promise((resolve, reject) => {
    const comando = `powershell -Command "& \\"${pathIrfanView}\\" \\"${carpetaDestino}\\*.dds\\" /convert=\\"${carpetaConvertidos}\\*.webp\\""`;

    exec(comando, (error) => {
      if (error) {
        console.error("❌ Error al convertir DDS a WEBP:", error.message);
        return reject(error);
      }

      resolve(true);
    });
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
};
