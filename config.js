"use strict";
var path = require('path');
var winston = require("winston");
var config = {};
config.maxParallelDownloads = 2;
config.awsCredentialsPath = './aws.credentials.json';
config.sqsQueueUrl = '*YOUR_QUEUE_URL*';
config.zipDirectory = path.join(__dirname, "downloads");
config.downloadServiceUrlPart = "downloadService";
config.requireAgolUser = false;
config.downloadHost = {
    protocol: "https",
    hostname: "*YOUR_HOSTNAME*",
    port: "" //leave empty for default protocol port
};
config.email = {
    alertFromAddress: "NOT_IMPLEMENTED",
    smtp: {
        server: "smtp.gmail.com",
        port: 465
    }
};
config.logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({ level: 'debug' })//,
     //   new (winston.transports.File)({ filename: 'c:/downloaderLog.log', level: 'debug' })
    ]
});
module.exports = config;

