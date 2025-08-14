// models/Vehiculo.js
module.exports = (sequelize) => {
  const { DataTypes } = require("sequelize");

  return sequelize.define("Vehiculo", {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    savegameId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    imagen: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    precioBase: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    antiguedadHoras: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    marca: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    categoria: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fechaCompra: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    extra: {
      type: DataTypes.JSON,
      allowNull: true, // por si necesitas añadir datos sin cambiar el schema
    },
  });
};
