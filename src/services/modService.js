// src/services/modService.js
const path = require("path");
const fs = require("fs");
const { Mods } = require("../config/sequelize"); // 👈 añade esto
const {
  abrirZip,
  encontrarModDesc,
  parsearModDesc,
  extraerIconFilename,
} = require("./modZipService");

const { extraerImagenDesdeZIP, copiarImagenDLC } = require("./imageService");

let resumenMods = [];
let expansiones = [];

/* ======================
   1. Reset de resumen
====================== */
function resetResumen() {
  resumenMods = [];
  expansiones = [];
}
/* ======================
   2. Procesar un ZIP de mod
====================== */
async function procesarModZip(modName, moddir) {
  const zipPath = path.join(moddir, `${modName}.zip`);
  let detalle = "";
  let ok = true;
  let datosFinales = null;

  try {
    // --- 1. Caso: el ZIP existe ---
    if (fs.existsSync(zipPath)) {
      let zip;
      try {
        zip = abrirZip(zipPath);
        if (!zip) throw new Error("No se pudo abrir ZIP");
      } catch (e) {
        resumenMods.push({
          modName,
          ok: false,
          detalle: `ZIP corrupto o error al abrir: ${e.message}`,
        });
        return;
      }

      // Buscar modDesc.xml
      const entry = encontrarModDesc(zip);
      if (!entry) {
        ok = false;
        detalle += "Falta modDesc.xml; ";
      }

      // Parsear modDesc.xml
      const { desc } = await parsearModDesc(zip, entry);

      // --- Títulos ---
      let title_es = "";
      let title_en = "";
      let tieneTitulo = false;

      if (desc.title?.[0]) {
        title_es = desc.title[0].es?.[0] || "";
        title_en = desc.title[0].en?.[0] || "";

        const idiomas = Object.values(desc.title[0]);
        tieneTitulo = idiomas.some(
          (v) => Array.isArray(v) && v.length > 0 && v[0].trim() !== ""
        );
      }

      if (!tieneTitulo) {
        ok = false;
        detalle += "No tiene título en modDesc.xml; ";
      }

      // --- Descripciones ---
      let description_es = null;
      let description_en = null;
      if (desc.description?.[0]) {
        description_es = desc.description[0].es?.[0] || null;
        description_en = desc.description[0].en?.[0] || null;
      }

      // Imagen/iconFilename
      const iconFile = extraerIconFilename(desc);
      let rutaExtraida = null;
      if (iconFile) {
        detalle += `iconFilename encontrado: ${iconFile}`;
        const nombreArchivo = path.basename(iconFile);
        rutaExtraida = extraerImagenDesdeZIP(zipPath, iconFile, nombreArchivo);
        if (!rutaExtraida) detalle += " - No se pudo extraer la imagen del ZIP";
      } else {
        detalle += "No se encontró iconFilename";
      }

      datosFinales = {
        modName,
        title: title_es || title_en || "Sin título",
        title_es,
        title_en,
        description_es,
        description_en,
        iconFilename: iconFile ? path.basename(iconFile) : null,
      };

      if (ok) {
        await guardarModEnBD(datosFinales);
      }
    }
    // --- 2. Caso: el ZIP no existe → leer de externals/expanciones/dlc.json ---
    else {
      const rutaJson = path.resolve(
        __dirname,
        "../../..",
        "externos/expanciones/dlc.json"
      );
      if (fs.existsSync(rutaJson)) {
        const data = JSON.parse(fs.readFileSync(rutaJson, "utf8"));
        const dlc = data.find((d) => d.modName === modName);

        if (dlc) {
          datosFinales = {
            modName: dlc.modName,
            title: dlc.titleES || dlc.titleEN || "Sin título",
            title_es: dlc.titleES || null,
            title_en: dlc.titleEN || null,
            description_es: dlc.descriptionES || null,
            description_en: dlc.descriptionEN || null,
            iconFilename: dlc.image || null,
          };

          // 👇 usar función del servicio para copiar la imagen
          const carpetaDestinoWebp = path.resolve(
            process.cwd(),
            "imgconvert",
            "convert"
          );

          copiarImagenDLC(rutaJson, dlc, carpetaDestinoWebp);

          await guardarModEnBD(datosFinales);
          detalle = "Cargado desde dlc.json (sin ZIP)";
          ok = true;
        } else {
          ok = false;
          detalle = "No existe el ZIP ni entrada en dlc.json";
        }
      } else {
        ok = false;
        detalle = "No existe el ZIP ni el archivo dlc.json";
      }
    }
  } catch (err) {
    ok = false;
    detalle += `Error general: ${err.message}`;
  }

  resumenMods.push({ modName, ok, detalle: detalle.trim() });
}

/* ======================
   3. Guardar en BD (solo actualizar si existe)
====================== */
async function guardarModEnBD(datos) {
  try {
    // Buscar si ya existe el mod por nombre
    const modExistente = await Mods.findOne({
      where: { modName: datos.modName },
    });

    if (modExistente) {
      // Si existe, actualizamos
      await Mods.update(
        {
          title_es: datos.title_es,
          title_en: datos.title_en,
          description_es: datos.description_es,
          description_en: datos.description_en,
          iconFilename: datos.iconFilename,
        },
        {
          where: { modName: datos.modName },
        }
      );

      //console.log(`🔄 Mod actualizado en BD: ${datos.modName}`);
    } else {
      console.log(
        `⚠️ No se encontró el mod en BD con nombre: ${datos.modName}. No se insertó nada.`
      );
    }
  } catch (err) {
    console.error(
      `❌ Error al actualizar mod ${datos.modName} en BD:`,
      err.message
    );
  }
}

/* ======================
   4. Mostrar resumen
====================== */
function mostrarResumen(savegameNumber) {
  console.log(`\n📊 Resumen savegame${savegameNumber}:`);
  const fallidos = resumenMods.filter((m) => !m.ok);

  if (fallidos.length === 0) {
    console.log("✅ Todos los mods procesados correctamente");
  } else {
    fallidos.forEach((mod) =>
      console.log(`❌ ${mod.modName} - ${mod.detalle}`)
    );
  }

  console.log(
    `\nTotal mods procesados: ${resumenMods.length}, Fallidos: ${fallidos.length}, Expansiones: ${expansiones.length}\n`
  );
}

module.exports = { procesarModZip, mostrarResumen, resetResumen };

/*
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");
const xml2js = require("xml2js");
const { extraerImagenDesdeZIP } = require("./imageService");

const parser = new xml2js.Parser();

let resumenMods = [];
let expansiones = []; // 📦 Lista separada de expansiones oficiales

function resetResumen() {
  resumenMods = [];
  expansiones = [];
}

async function procesarModZip(modName, moddir) {
  try {
    // 📌 Verificamos si es expansión oficial
    if (modName.toLowerCase().startsWith("pdlc_")) {
      expansiones.push({ modName, oficial: true });
      return null; // No lo tratamos como mod
    }

    const zipPath = path.join(moddir, `${modName}.zip`);
    if (!fs.existsSync(zipPath)) {
      resumenMods.push({ modName, error: "No existe el ZIP" });
      return null;
    }

    const zip = new AdmZip(zipPath);
    const entry = zip.getEntry("modDesc.xml");
    if (!entry) {
      resumenMods.push({ modName, error: "Falta modDesc.xml" });
      return null;
    }

    // 📖 Leer y parsear modDesc.xml
    const xmlData = zip.readAsText(entry);
    const parsed = await parser.parseStringPromise(xmlData);
    const desc = parsed?.modDesc || {};

    // ⚙️ Extraemos textos según idioma (validación mínima)
    const title_es = desc.title?.[0]?._ || desc.title?.[0] || "";
    if (!title_es) {
      resumenMods.push({ modName, error: "No tiene título en modDesc.xml" });
    }

    // 🖼️ Manejo de icono
    const iconName = desc.icon?.[0] || null;
    if (iconName) {
      try {
        const nombreDDS = path.basename(iconName);
        extraerImagenDesdeZIP(zipPath, iconName, nombreDDS);
      } catch (e) {
        resumenMods.push({
          modName,
          error: `Error procesando icono: ${e.message}`,
        });
      }
    }

    resumenMods.push({ modName, ok: true });
    return null;
  } catch (err) {
    resumenMods.push({ modName, error: `Error general: ${err.message}` });
    return null;
  }
}

function mostrarResumen(savegameNumber) {
  const totalMods = resumenMods.length;
  const totalExpansiones = expansiones.length;
  const fallidos = resumenMods.filter((m) => m.error);

  if (fallidos.length > 0) {
    console.log(`\n⚠️ Errores en savegame${savegameNumber}:`);
    console.table(fallidos);
  } else {
    console.log(`✅ No hubo errores en savegame${savegameNumber}`);
  }

  console.log(
    `📊 Resumen savegame${savegameNumber}: ${totalMods} mods procesados, ${fallidos.length} fallidos, ${totalExpansiones} expansiones oficiales detectadas.\n`
  );
}

module.exports = { procesarModZip, mostrarResumen, resetResumen };





// src/services/modService.js
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");
const xml2js = require("xml2js");
const { Mods } = require("../config/sequelize");
const {
  extraerImagenDesdeZIP,
  convertirDDSaWEBP,
} = require("./imageService");

const parser = new xml2js.Parser();

async function procesarModZip(modName, moddir) {
  try {
    const zipPath = path.join(moddir, `${modName}.zip`);
    if (!fs.existsSync(zipPath)) {
      console.warn(`⛔ No existe el ZIP para el mod ${modName}`);
      return null;
    }

    const zip = new AdmZip(zipPath);
    const entry = zip.getEntry("modDesc.xml");
    if (!entry) {
      console.warn(`⚠️ ${modName} no tiene modDesc.xml`);
      return null;
    }

    // 📖 Leer y parsear modDesc.xml
    const xmlData = zip.readAsText(entry);
    const parsed = await parser.parseStringPromise(xmlData);
    const desc = parsed?.modDesc || {};

    // ⚙️ Extraemos textos según idioma
    const title_es = desc.title?.[0]?._ || desc.title?.[0] || "";
    const title_en = desc.title?.[1]?._ || desc.title?.[1] || null;

    const description_es = desc.description?.[0]?._ || desc.description?.[0] || "";
    const description_en = desc.description?.[1]?._ || desc.description?.[1] || null;

    // 🖼️ Manejo de icono
    const iconName = desc.icon?.[0] || null;
    let iconFinal = null;

    if (iconName) {
      try {
        const nombreDDS = path.basename(iconName);
        const rutaTempDDS = extraerImagenDesdeZIP(zipPath, iconName, nombreDDS);

        if (rutaTempDDS) {
          // Convertimos el DDS -> WEBP
          await convertirDDSaWEBP();
          iconFinal = path.basename(nombreDDS, path.extname(nombreDDS)) + ".webp";
        }
      } catch (e) {
        console.warn(`⚠️ No se pudo procesar el icono de ${modName}: ${e.message}`);
      }
    }

    // 🔄 Actualizar en BD
    await Mods.update(
      {
        title: title_es || undefined, // dejamos title como el español por defecto
        title_es,
        title_en,
        description_es,
        description_en,
        iconFilename: iconFinal || null,
      },
      { where: { modName } }
    );

    console.log(`✅ Mod ${modName} enriquecido con datos de modDesc.xml`);
    return {
      modName,
      title_es,
      title_en,
      description_es,
      description_en,
      icon: iconFinal,
    };
  } catch (err) {
    console.error(`❌ Error procesando ZIP de ${modName}:`, err.message);
    return null;
  }
}

module.exports = { procesarModZip };
*/
