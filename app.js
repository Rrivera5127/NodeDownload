var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require("express-handlebars");
var download = require('./routes/download');
var config = require("./config");
var app = express();
app.use(logger('dev'));

app.engine("handlebars", exphbs());
app.set("view engine", "handlebars");


app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());

app.use('/' + config.downloadServiceUrlPart, express.static(__dirname + '/downloads'));

app.use('/download', download);

/// catch 404 and forwarding to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});


// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    return res.json({message: err.message});
});


module.exports = app;
