
var express = require('express')
var app = express()

require('./app/routes/htmlroutes.js').htmlRoutes(app)
require('./app/routes/apiroutes.js')(app)

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.listen('8080')
