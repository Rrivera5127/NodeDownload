var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var exphbs = require("express-handlebars");
var download = require('./routes/download');
var config = require("./config.dev");//switch to config
var logger = config.logger;

var downloadQueueService = require("./services/DownloadQueueService");
//kick off the message listener the first time
downloadQueueService.startListener();

var app = express();

app.engine("handlebars", exphbs());
app.set("view engine", "handlebars");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

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
    logger.error(err);
    res.status(err.status || 500);
    return res.json({message: err.message});
});

module.exports = app;
