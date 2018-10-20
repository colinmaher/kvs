
'use strict'

const express = require('express');


const PORT = 8080;
const HOST = '0.0.0.0';

const app = express();

app.get('/hello', (req, res) => {
  res.send('Hello world!');
});

app.post('/hello', (req, res) => {
  res.send(405);
});

app.get('/test', (req, res) => {
  res.send('GET request received');
});

app.post('/test', (req, res) => {
  res.send('POST message received: ' + req.query.msg);
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);