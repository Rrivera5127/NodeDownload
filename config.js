"use strict";
var path = require('path');
var winston = require("winston");
var AWS = require('aws-sdk');
var config = {};
config.awsCredentialsPath = './aws.credentials.json';  //change this to aws.credentials.json and populate your secret and access keys
config.sqsUrl = '';
config.s3 = {
    bucketName: "",
    uploadACL: 'public-read',
    bucketUrlPrefix: ""

};
config.zipDirectory = path.join(__dirname, "downloads");
config.requireAgolUser = true;
config.logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({ level: 'debug'  }),
        new (winston.transports.File)({ filename: 'c:/temp/downloaderLog.log', level: 'debug' })
    ]
});
AWS.config.loadFromPath(config.awsCredentialsPath);
module.exports = config;