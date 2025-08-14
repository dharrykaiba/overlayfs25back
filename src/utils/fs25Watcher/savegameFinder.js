const fs = require("fs");
const path = require("path");
const { basePath, cacheDir } = require("./paths");

function encontrarSavegames() {
  const savegames = [];
  let i = 1;

  while (true) {
    const savePath = path.join(basePath, `savegame${i}`);
    if (fs.existsSync(savePath)) {
      savegames.push({
        path: savePath,
        number: i,
        vehiclesPath: path.join(savePath, "vehicles.xml"),
        metaPath: path.join(savePath, "careerSavegame.xml"),
        cachePath: path.join(cacheDir, `saveInfo_${i}.json`)
      });
      i++;
    } else {
      break;
    }
  }
  return savegames;
}

module.exports = { encontrarSavegames };
