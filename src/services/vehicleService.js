// src/services/vehicleService.js
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const AdmZip = require("adm-zip");
const { Vehiculo } = require("../config/sequelize");
const {
  copiarDDS,
  extraerImagenDesdeZIP,
  convertirDDSaWEBP,
} = require("./imageService");

const parser = new xml2js.Parser();

/* ======================
   1. Función principal
====================== */
const leerXML = async (filePath, gameDataPath, moddir, savegameId) => {
  try {
    const xmlData = await leerArchivoXML(filePath);
    const parsed = await parser.parseStringPromise(xmlData);

    console.clear();
    console.log("\n🚜 Vehículos COMPRADOS:\n");

    const vehiculos = parsed?.vehicles?.vehicle || [];
    const salida = [];
    const imagenesProcesadas = new Set();
    let comprados = 0;

    for (const vehiculo of vehiculos) {
      if (!esVehiculoComprado(vehiculo)) continue;
      comprados++;

      const datosVehiculo = await procesarVehiculo(
        vehiculo,
        gameDataPath,
        moddir,
        imagenesProcesadas
      );

      if (datosVehiculo) {
        salida.push(datosVehiculo);
        await guardarVehiculoEnBD(datosVehiculo, savegameId);
      }
    }

    await convertirDDSaWEBP();
    console.log(
      `\n✅ [Savegame ${savegameId}] ${comprados} vehículos procesados.\n`
    );
    return salida;
  } catch (err) {
    console.error("❌ Error en leerXML:", err.message);
    throw err;
  }
};

/* ======================
   2. Lectura XML base
====================== */
async function leerArchivoXML(ruta) {
  return fs.promises.readFile(ruta, "utf-8");
}

/* ======================
   3. Filtrar comprados
====================== */
function esVehiculoComprado(vehiculo) {
  const attrs = vehiculo.$ || {};
  const farmId = parseInt(attrs.farmId || "-1");
  const propertyState = attrs.propertyState || "";
  return farmId > 0 || propertyState === "OWNED";
}

/* ======================
   4. Procesar vehículo
====================== */
async function procesarVehiculo(
  vehiculo,
  gameDataPath,
  moddir,
  imagenesProcesadas
) {
  const attrs = vehiculo.$ || {};
  const filename = attrs.filename || "";
  const nombreArchivo = path.basename(filename);
  const uniqueId = attrs.uniqueId || nombreArchivo;
  const edadHoras = parseFloat(attrs.age || "0");
  const precioBase = parseFloat(attrs.price || "0");

  // Leer XML del vehículo
  const { xmlData, rutaXMLCompleta, zipPath } = await obtenerXMLVehiculo(
    filename,
    gameDataPath,
    moddir
  );
  if (!xmlData) return null;

  // Parsear XML del vehículo
  const parsedVehiculo = await parser.parseStringPromise(xmlData);
  const storeData = parsedVehiculo?.vehicle?.storeData?.[0] || {};

  // Procesar imagen
  const rutaImagen = await procesarImagenVehiculo(
    storeData.image?.[0]?.trim() || "",
    filename,
    gameDataPath,
    moddir,
    zipPath,
    imagenesProcesadas
  );
  if (!rutaImagen) return null;

  // Datos finales
  const marca = obtenerMarca(storeData.brand);
  const categoria = storeData.category?.[0] || "N/A";
  const anchoTrabajo = storeData.specs?.[0]?.workingWidth?.[0] || "N/A";

  return {
    id: uniqueId,
    nombre: nombreArchivo,
    imagen: path.basename(rutaImagen, path.extname(rutaImagen)) + ".webp",
    precioBase,
    antiguedadHoras: edadHoras,
    marca,
    categoria,
    fechaCompra: new Date(),
    extra: {
      archivoOriginal: {
        zipPath,
        xmlPath: rutaXMLCompleta.replace(zipPath + " > ", ""),
      },
      originalFilename: filename,
      anchoTrabajo,
    },
  };
}

/* ======================
   5. Obtener XML desde $moddir o $data
====================== */
async function obtenerXMLVehiculo(filename, gameDataPath, moddir) {
  let xmlData = "";
  let rutaXMLCompleta = "";
  let zipPath = "";

  if (filename.includes("$moddir$")) {
    const modRelPath = filename.replace("$moddir$", "").split("/");
    const zipName = `${modRelPath[0]}.zip`;
    const fileInsideZip = modRelPath.slice(1).join("/");
    zipPath = path.join(moddir, zipName);

    try {
      const zip = new AdmZip(zipPath);
      const entry = zip.getEntry(fileInsideZip);
      if (!entry) return {};
      xmlData = zip.readAsText(entry);
      rutaXMLCompleta = `${zipPath} > ${fileInsideZip}`;
    } catch {
      console.warn(`⛔ ZIP inválido: ${path.basename(zipPath)}`);
      return {};
    }
  } else {
    rutaXMLCompleta = path.resolve(
      gameDataPath,
      filename.replace("$data", "data")
    );
    try {
      xmlData = await fs.promises.readFile(rutaXMLCompleta, "utf-8");
    } catch {
      console.warn(`⛔ XML no encontrado: ${path.basename(rutaXMLCompleta)}`);
      return {};
    }
  }

  return { xmlData, rutaXMLCompleta, zipPath };
}

/* ======================
   6. Procesar imagen
====================== */
async function procesarImagenVehiculo(
  imageRaw,
  filename,
  gameDataPath,
  moddir,
  zipPath,
  imagenesProcesadas
) {
  if (!imageRaw) {
    console.warn("⚠️ Vehículo sin imagen válida. Omitido.");
    return null;
  }

  const imageName = path.basename(imageRaw).replace(/\.png$/i, ".dds");
  if (imagenesProcesadas.has(imageName)) {
    return path.join("imagenes_webp", imageName.replace(".dds", ".webp"));
  }

  imagenesProcesadas.add(imageName);
  let rutaTemp = null;

  if (filename.includes("$moddir$")) {
    rutaTemp = extraerImagenDesdeZIP(zipPath, imageName, imageName);
  } else {
    const imagePath = path
      .normalize(path.join(gameDataPath, imageRaw.replace("$data/", "data/")))
      .replace(/\.png$/, ".dds");
    if (fs.existsSync(imagePath)) {
      rutaTemp = copiarDDS(imagePath, imageName);
    } else {
      console.warn(`🖼️ Imagen no encontrada: ${imageName}`);
    }
  }

  return (
    rutaTemp || path.join("imagenes_webp", imageName.replace(".dds", ".webp"))
  );
}

/* ======================
   7. Marca
====================== */
function obtenerMarca(brand) {
  return Array.isArray(brand)
    ? typeof brand[0] === "string"
      ? brand[0]
      : brand[0]?._ || "N/A"
    : "N/A";
}

/* ======================
   8. Guardar en BD (corregida)
====================== */
async function guardarVehiculoEnBD(datos, savegameId) {
  try {
    // Usamos un identificador único combinado si es necesario
    const idCompuesto = `${datos.id}__SAVEGAME${savegameId}`;

    await Vehiculo.upsert({
      ...datos,
      id: idCompuesto, // ← Ahora sí se fuerza un ID único por savegame
      savegameId,
      extra: {
        anchoTrabajo: datos.extra.anchoTrabajo,
        zipPath: datos.extra.archivoOriginal.zipPath,
        originalFilename: datos.extra.originalFilename,
        xmlFilename: datos.extra.archivoOriginal.xmlPath
      }
    }, {
      fields: Object.keys(datos).concat("savegameId"),
      returning: true
    });
  } catch (err) {
    console.error(`❌ Error al guardar vehículo ${datos.id} en BD:`, err.message);
  }
}

module.exports = { leerXML };
