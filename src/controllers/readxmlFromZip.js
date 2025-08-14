// src/controllers/readxmlFromZip.js
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const AdmZip = require("adm-zip");

const modsPath = process.env.GAME_USER_PATH + "/mods"; // mejor usar .env
const parser = new xml2js.Parser({ explicitArray: false });

exports.explorarXMLsEnZIP = async (req, res) => {
  try {
    // Recibir nombre del ZIP desde query param
    const nombreZIP = req.query.nombre;

    if (!nombreZIP) {
      return res.status(400).json({ error: "Falta el parámetro 'nombre' del ZIP" });
    }

    const zipPath = path.join(modsPath, nombreZIP);

    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ error: `ZIP ${nombreZIP} no encontrado` });
    }

    const zip = new AdmZip(zipPath);
    const entradas = zip.getEntries();
    const resultado = [];

    for (const entrada of entradas) {
      if (entrada.entryName.endsWith(".xml")) {
        try {
          const contenido = entrada.getData().toString("utf-8");
          const parsed = await parser.parseStringPromise(contenido);
          const etiquetasRaiz = Object.keys(parsed);
          const raiz = etiquetasRaiz[0] || "desconocido";

          const subEtiquetas = [];
          const contenidoRaiz = parsed[raiz];

          if (typeof contenidoRaiz === "object") {
            for (const clave in contenidoRaiz) {
              const valor = contenidoRaiz[clave];

              if (typeof valor === "object" && valor !== null) {
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
            archivo: entrada.entryName,
            raiz,
            subEtiquetas,
          });
        } catch (err) {
          resultado.push({
            archivo: entrada.entryName,
            error: `No se pudo parsear: ${err.message}`,
          });
        }
      }
    }

    res.json({
      total: resultado.length,
      archivos: resultado,
    });
  } catch (err) {
    console.error("❌ Error al explorar ZIP:", err.message);
    res.status(500).json({ error: "No se pudieron explorar los XMLs en el ZIP" });
  }
};
