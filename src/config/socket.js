//src/config/socket.js
const { Server } = require("socket.io");

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // Cambia esto si necesitas restringir el acceso
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Cliente conectado al WebSocket");

    socket.on("disconnect", () => {
      console.log("🔴 Cliente desconectado");
    });
  });
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO no ha sido inicializado.");
  }
  return io;
};

module.exports = {
  initSocket,
  getIO,
};
