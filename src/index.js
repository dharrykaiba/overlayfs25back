//src/index.js
require('dotenv').config(); // Importar dotenv
const Server = require('./config/server');
const logserver = new Server();
logserver.start();