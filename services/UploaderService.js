"use strict";
var AWS = require('aws-sdk');
var config = require('../config.dev');
var Promise = require("promise");
var path = require("path");
var fs = require('fs');
var logger = config.logger;
var s3 = new AWS.S3();
var UPLOAD_CONTENT_TYPE = "application/octet-stream";

module.exports.uploadFile = function (filePath, remoteFilename) {
    logger.debug("uploading file [%s] to [%s %s]", filePath, config.uploadBucketName, remoteFilename);
    return new Promise(function (resolve, reject) {
        s3.putObject({
            ACL: config.s3.uploadACL,
            Bucket: config.s3.bucketName,
            Key: remoteFilename,
            Body: fs.readFileSync(filePath),
            ContentType: UPLOAD_CONTENT_TYPE
        }, function (error, response) {
            //todo delete the empty folder
            fs.unlink(filePath);
            console.dir(response);
            if (error) {
                reject(error);
            }
            else {
                logger.info('uploaded file[' + filePath + '] to [' + remoteFilename + ']');
                logger.debug(arguments);
                resolve(response);
            }
        });
    });
};
