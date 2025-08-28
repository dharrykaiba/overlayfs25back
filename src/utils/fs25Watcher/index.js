const { encontrarSavegames } = require("./savegameFinder");
const { procesarSavegame } = require("./savegameProcessor");

let firstRun = true;

async function cargarDatosXML() {
  const savegames = encontrarSavegames();
  if (!savegames.length) {
    console.log("⚠️ No se encontraron savegames.");
    return;
  }

  if (firstRun) {
    console.log(`🔍 Encontrados ${savegames.length} savegames:`);
    savegames.forEach(sg => console.log(` - savegame${sg.number}`));
    firstRun = false;
  }

  const results = await Promise.all(savegames.map(procesarSavegame));
  const ahora = new Date().toLocaleString();
  let hasChanges = false;

  results.forEach(result => {
    if (result.status !== "unchanged" && result.message) {
      console.log(result.message);
      hasChanges = true;
    }
  });


  if (!hasChanges) {
    console.log(`🕒 [${ahora}] Sin cambios en savegames`);
  }

  if (hasChanges || firstRun) {
    const used = process.memoryUsage();
    console.log(`📊 Memoria usada: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);
  }
}

module.exports = { cargarDatosXML };
