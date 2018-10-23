'use strict'

const express = require('express');

const PORT = 8080;
const HOST = '0.0.0.0';

const app = express();



//Forwards all routing protocols to keyValue-store.js
const keyRoutes = require('./api/routes/keyValue-store');
app.use('/keyValue-store', keyRoutes);

// const searchOneRoute = require('./api/routes/isKeyExists');
// app.use('/isKeyExists', searchOneRoute);
//
// const searchTwoRoute = require('./api/routes/getValue');
// app.use('/getValue', searchTwoRoute);


app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);

module.exports = app;
