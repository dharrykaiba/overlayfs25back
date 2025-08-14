// src/routes/fs25Routes.js
const express = require('express');
const router = express.Router();

const { obtenerXML } = require('../controllers/fs25Reader');
const { explorarXMLs } = require('../controllers/readxml');
const { explorarXMLsEnZIP } = require("../controllers/readxmlFromZip");

router.get('/xml', obtenerXML);
router.get('/explorar', explorarXMLs);
router.get('/explorarxmlzip', explorarXMLsEnZIP); // ?nombre=NombreDelZIP

module.exports = router;
