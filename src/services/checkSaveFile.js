//src/services/checkSaveFile.js
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

const { CareerSave, Mods } = require("../config/sequelize"); // 👈 importamos el modelo

const gameUserPath = process.env.GAME_USER_PATH;
const savegameSlot = process.env.SAVEGAME_SLOT;

if (!gameUserPath) {
  throw new Error("La variable de entorno GAME_USER_PATH no está definida");
}
if (!savegameSlot) {
  throw new Error("La variable de entorno SAVEGAME_SLOT no está definida");
}

const filePath = path.join(
  gameUserPath,
  `savegame${savegameSlot}`,
  "careerSavegame.xml"
);

const leersavexml = async (savegamePath, savegameId) => {
  // Añadir savegameId como parámetro
  try {
    const filePath = path.join(savegamePath, "careerSavegame.xml");
    const xmlData = fs.readFileSync(filePath, "utf-8");

    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
    });
    const result = await parser.parseStringPromise(xmlData);

    console.log(
      `✅ careerSavegame.xml (savegame${savegameId}) leído correctamente.`
    );

    if (result && result.careerSavegame) {
      const save = result.careerSavegame;

      const playTime = parseFloat(save.statistics?.playTime || 0);
      const money = parseInt(save.statistics?.money || 0);

      // Guardar en la base de datos con savegameId
      const [careerSave, created] = await CareerSave.upsert(
        {
          savegameId, // Incluir savegameId
          playTime,
          totalMoney: money,
          extra: save,
        },
        {
          returning: true,
        }
      );

      console.log(
        `📦 Datos de savegame${savegameId} ${
          created ? "creados" : "actualizados"
        } en BD`
      );

      // 📌 Procesamos los mods del save
      if (save.mod) {
        const modsArray = Array.isArray(save.mod) ? save.mod : [save.mod];
        const saveSlot = savegameId.toString().padStart(3, "0");

        for (const mod of modsArray) {
          try {
            const safeModData = {
              modName: mod.modName || "UnknownMod",
              title: mod.title || "Sin título",
              version: mod.version || "-1.0.0",
              required: mod.required === "true",
            };

            // Buscar si ya existe solo para rescatar savegames
            const existing = await Mods.findOne({
              where: { modName: safeModData.modName },
            });

            let savegames = [];
            if (existing) {
              savegames = Array.isArray(existing.savegames)
                ? [...existing.savegames]
                : [];
            }

            if (!savegames.includes(saveSlot)) {
              savegames.push(saveSlot);
            }

            await Mods.upsert({ ...safeModData, savegames });
          } catch (err) {
            console.warn(
              `⚠️ Error procesando mod (checksavafile.js) ${
                mod.modName || "Unknown"
              } (savegame ${saveSlot}): ${err.message}`
            );
          }
        }
      }

      return {
        playTime,
        totalMoney: money,
        farms: save.farms?.farm || [],
        mods: save.mod || [],
      };
    } else {
      console.warn("⚠️ No se encontró la estructura esperada en el XML.");
      return null;
    }
  } catch (err) {
    console.error(
      `❌ Error al procesar careerSavegame.xml (savegame${savegameId}):`,
      err.message
    );
    throw err;
  }
};

module.exports = {
  leersavexml,
};
