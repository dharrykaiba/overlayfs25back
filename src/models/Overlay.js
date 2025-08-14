// models/Overlay.js

module.exports = (sequelize) => {
  const { DataTypes } = require("sequelize");

  return sequelize.define("Overlay", {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    resolucion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    texto: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    extra: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  });
};
