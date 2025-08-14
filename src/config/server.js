// src/config/server.js
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const fs = require("fs");
const detectPort = require("detect-port-alt"); // 🔹 Usamos detect-port-alt

const { initSocket } = require("./socket");
const { conexion } = require("./sequelize");

const overlay_router = require("../routes/overlayRoutes");
const fs25Routes = require("../routes/fs25Routes");
const vehicleRoutes = require("../routes/vehicleRoutes");
const modsRoutes = require("../routes/modsRoutes");

const { cargarDatosXML } = require("../utils/fs25Watcher");

class Server {
  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT) || 3001;

    this.habilitarCORS();
    this.configurarBodyParser();
    this.definirRutas();
  }

  habilitarCORS() {
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
      next();
    });
  }

  configurarBodyParser() {
    this.app.use(bodyParser.json());
  }

  definirRutas() {
    this.app.get("/", (req, res) => {
      res.status(200).json({
        ok: true,
        message: "La API Funciona! 😊🎃😎🎉",
        port: this.port,
      });
    });

    this.app.use(
      "/images",
      express.static(path.join(__dirname, "../../imgconvert/convert"))
    );
    this.app.use("/overlay", overlay_router);
    this.app.use("/fs25", fs25Routes);
    this.app.use("/vehicle", vehicleRoutes);
    this.app.use("/mods", modsRoutes);
    
  }

  async actualizarEnvPuerto(nuevoPuerto) {
    const envPath = path.resolve(__dirname, "../../.env");
    if (!fs.existsSync(envPath)) return;

    let contenido = fs.readFileSync(envPath, "utf8");
    if (contenido.includes("PORT=")) {
      contenido = contenido.replace(/PORT=\d+/, `PORT=${nuevoPuerto}`);
    } else {
      contenido += `\nPORT=${nuevoPuerto}`;
    }
    fs.writeFileSync(envPath, contenido, "utf8");

    console.log(`⚠️  Puerto cambiado en .env a ${nuevoPuerto}`);
  }

  async start() {
    // 🔹 Buscar puerto disponible usando detect-port-alt
    const puertoLibre = await detectPort(this.port);

    if (puertoLibre !== this.port) {
      console.log(
        `⚠️  Puerto ${this.port} en uso. Usando ${puertoLibre} en su lugar.`
      );
      this.port = puertoLibre;
      await this.actualizarEnvPuerto(this.port);
    }

    const httpServer = http.createServer(this.app);
    initSocket(httpServer);

    httpServer.listen(this.port, "0.0.0.0", async () => {
      console.log(`✅ Server ON - Port: ${this.port}`);
      console.log(`🌐 Accede al servidor en: http://localhost:${this.port}`);

      try {
        const isDev = process.env.NODE_ENV !== "production";

        await conexion.authenticate();
        console.log("📡 Conexión a la base de datos establecida con éxito.");

        await conexion.sync({
          alter: isDev,
          force: process.env.DB_FORCE === "true",
        });

        console.log("📁 Base de datos sincronizada correctamente");

        (async () => {
          console.log("🚀 Escaneo inicial de savegames...");
          await cargarDatosXML(); // Espera a que termine antes de seguir
          console.log("✅ Escaneo inicial completado.");

          // 🔹 Ahora sí, empezar el intervalo cada 5s
          setInterval(async () => {
            try {
              await cargarDatosXML();
            } catch (err) {
              console.error("❌ Error en escaneo periódico:", err);
            }
          }, 5000);
        })();
      } catch (error) {
        console.error(error);
        console.error(
          "❌ Error al conectar o sincronizar la base de datos:",
          error.message
        );
      }
    });
  }
}

module.exports = Server;
