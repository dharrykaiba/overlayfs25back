//models/CareerSave.js
module.exports = (sequelize) => {
  const { DataTypes } = require("sequelize");

  return sequelize.define("CareerSave", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    savegameId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // Cada savegame solo puede tener un CareerSave
    },
    playTime: {
      type: DataTypes.INTEGER,
      allowNull: true, // en minutos o segundos según lo que devuelva el XML
    },
    totalMoney: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    extra: {
      type: DataTypes.JSON,
      allowNull: true, // guarda todo el XML si quieres tenerlo completo
    },
  });
};
