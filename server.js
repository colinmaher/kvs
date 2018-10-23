'use strict'

const express = require('express');

const PORT = 8080;
const HOST = '0.0.0.0';

const app = express();

//Forwards all routing protocols to keyValue-store.js
const keyRoutes = require('./api/routes/keyValue-store');
app.use('/keyValue-store', keyRoutes);

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);

module.exports = app;