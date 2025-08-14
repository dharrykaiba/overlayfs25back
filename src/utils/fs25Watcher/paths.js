const fs = require("fs");
const path = require("path");

const basePath = "D:/Dharry/My Games/FarmingSimulator2025";
const gameDataPath = "E:/Games/Farming Simulator 25/";
const moddir = `${basePath}/mods`;

const appRoot = process.cwd();
const cacheDir = path.join(appRoot, "cache");

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

module.exports = {
  basePath,
  gameDataPath,
  moddir,
  cacheDir
};
