'use strict'

const express = require('express')
var bodyParser = require('body-parser')
const PORT = 8080;
const HOST = '0.0.0.0'

const app = express()

// app.use(bodyParser.json({extended: true})); // for parsing application/json
app.use(bodyParser.urlencoded({
  extended: true
})) // for parsing application/x-www-form-urlencoded

//Forwards all routing protocols to keyValue-store.js
const keyRoutes = require('./api/routes/keyValue-store')
app.use('/keyValue-store', keyRoutes)
app.listen(PORT, HOST)
console.log(`Running on http://${HOST}:${PORT}`)

module.exports = app