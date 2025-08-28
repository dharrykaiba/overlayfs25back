// config/sequelize.js
const Sequelize = require("sequelize");
const overlay_model = require("../models/Overlay");
const vehiculo_model = require("../models/Vehiculo"); // 👈 nuevo modelo
const career_save_model = require("../models/CareerSave"); // 👈 nuevo modelo
const mods_model = require("../models/Mods"); // 👈 nuevo modelo

const conexion = new Sequelize({
  dialect: "sqlite",
  storage: "./database/overlay.db", // Ruta al archivo .db local
  logging: false,
  //timezone: "-05:00",
});

const Overlay = overlay_model(conexion);
const Vehiculo = vehiculo_model(conexion); // 👈 instancia del modelo
const CareerSave = career_save_model(conexion); // 👈 instancia
const Mods = mods_model(conexion); // 👈 instancia

conexion.sync(); // crea las tablas si no existen

module.exports = {
  Sequelize,
  conexion,
  Overlay,
  Vehiculo,
  Mods,
  CareerSave, // 👈 exportamos // 👈 exportamos el modelo también
};
