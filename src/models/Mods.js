//src/models/Mods.js
module.exports = (sequelize) => {
  const { DataTypes } = require("sequelize");
  return sequelize.define("Mods", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // Datos básicos del mod
    modName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // funciona en SQLite ✅
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    // Info extraída del XML dentro del zip
    title_en: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    title_es: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    description_en: {
      type: DataTypes.TEXT("long"), // soporta CDATA grande
      allowNull: true,
    },
    description_es: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },

    // Imagen del mod (ej. icon_PerfectEdge.dds)
    iconFilename: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Campo para partidas (3 dígitos por savegame)
    savegames: {
      type: DataTypes.JSON, // ejemplo: ["001","003","010"]
      allowNull: true,
      defaultValue: [],
    },
  });
};
