// src/controllers/readxml.js
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

const parser = new xml2js.Parser({ explicitArray: false });
// Construir ruta usando variables de entorno
const savegamePath = path.join(
  process.env.GAME_USER_PATH,
  `savegame${process.env.SAVEGAME_SLOT}`
);

exports.explorarXMLs = async (req, res) => {
  try {
    const archivosXML = fs
      .readdirSync(savegamePath)
      .filter((file) => file.endsWith(".xml"));
    const resultado = [];

    for (const archivo of archivosXML) {
      const fullPath = path.join(savegamePath, archivo);
      const contenido = fs.readFileSync(fullPath, "utf-8");

      try {
        const parsed = await parser.parseStringPromise(contenido);
        const etiquetasRaiz = Object.keys(parsed);
        const raiz = etiquetasRaiz[0] || "desconocido";

        const subEtiquetas = [];
        const contenidoRaiz = parsed[raiz];

        if (typeof contenidoRaiz === "object") {
          for (const clave in contenidoRaiz) {
            const valor = contenidoRaiz[clave];

            if (typeof valor === "object" && valor !== null) {
              // Sub-subetiquetas
              subEtiquetas.push({
                etiqueta: clave,
                tipo: "objeto",
                subCampos: Object.keys(valor),
              });
            } else {
              subEtiquetas.push({
                etiqueta: clave,
                tipo: "texto",
                valor,
              });
            }
          }
        }

        resultado.push({
          archivo,
          raiz,
          subEtiquetas,
        });
      } catch (err) {
        resultado.push({
          archivo,
          error: `No se pudo parsear: ${err.message}`,
        });
      }
    }

    res.json({
      total: resultado.length,
      archivos: resultado,
    });
  } catch (err) {
    console.error("❌ Error al explorar XMLs:", err.message);
    res.status(500).json({ error: "No se pudieron explorar los XMLs" });
  }
};
