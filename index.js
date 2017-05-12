'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./src/routes')
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(process.env.PORT || 8080, () => {
    console.log('Express server listening on port %d in $s mode', server.address().port, app.settings.env);
});

app.post('/slack/action-endpoint', (req, res) => {
  routes.handleActionEndpoint(req, res)
});

app.post('/slack', (req, res) => {
  routes.handleSlack(req, res)
});

app.get('/slack/oauth', (req, res) => {
  routes.handleAuthentication(req, res)
});
