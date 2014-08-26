"use strict";
var AWS = require('aws-sdk');
var sanitizeFilename = require("sanitize-filename");
var config = require('../config.dev');
var Promise = require("promise");
var path = require("path");
var cp = require('child_process');
var url = require('url');
var util = require("util");


var S3UploadService = require("./UploaderService");
var DownloadAlertService = require("./DownloadAlertService");
var sqs = new AWS.SQS();
var logger = config.logger;

var ZIP_EXTENSION = ".zip";

function deleteMessage(handle) {
    logger.info("deleteMessage: %s", handle);
    sqs.deleteMessage({
        "QueueUrl": config.sqsUrl,
        "ReceiptHandle": handle
    }, function (err, data) {
        logger.info("deleted message");
        if (!err) {
        }
        else {
        }
    });
}
function initDownload(zipJob) {
    var zipProcess, zipFileName;
    return new Promise(function (resolve, reject) {
        try {
            //don't know if a new process is necessary
            zipProcess = cp.fork(__dirname + "/../services/ZipCreator");
            zipProcess.on("exit", function () {
                resolve(zipJob);
            });
            zipProcess.send(zipJob);
        }
        catch
            (err) {
            logger.error(err);
            reject(err);
        }
    });
}
function createZipJob(messageJson, receiptHandle) {
    //create zip job
    var zipJob = {
        zipFileName: util.format("%s-%s%s", sanitizeFilename(messageJson.orderName), new Date().getTime(), ZIP_EXTENSION),
        orderItems: (typeof messageJson.orderItems) === 'string' ? JSON.parse(messageJson.orderItems) : messageJson.orderItems,
        recipientEmail: messageJson.recipientEmail,
        messageHandle: receiptHandle,
        outFolder: config.zipDirectory
    };
    zipJob.fullFilePath = path.join(zipJob.outFolder, zipJob.zipFileName);
    zipJob.outputURL = url.resolve(config.s3.bucketUrlPrefix, zipJob.zipFileName);
    return zipJob;
}

function readMessage() {
    sqs.receiveMessage({
        "QueueUrl": config.sqsUrl,
        "MaxNumberOfMessages": 1,
        "VisibilityTimeout": 30,
        "WaitTimeSeconds": 20
    }, function (err, data) {
        var bodyAsJson;
        //make sure the SQS message has enough info
        if (data && data.Messages && (typeof data.Messages[0] !== 'undefined' && typeof data.Messages[0].Body !== 'undefined')) {
            logger.info("Servicing: " + data.Messages[0].MessageId);
            try {
                bodyAsJson = JSON.parse(data.Messages[0].Body);
                var zipJob = createZipJob(bodyAsJson, data.Messages[0].ReceiptHandle);
                //download the requested files locally into a zip
                initDownload(zipJob).then(function (zipDownloadResponse) {
                    //completed. todo: check to make sure all files were zipped
                    if (zipDownloadResponse) {
                        S3UploadService.uploadFile(zipDownloadResponse.fullFilePath, zipDownloadResponse.zipFileName).then(function (data) {
                                // resolved
                                if (data) {
                                    DownloadAlertService.alertUser(zipDownloadResponse.outputURL, zipDownloadResponse.recipientEmail);
                                    //todo need to check for email success
                                    deleteMessage(zipDownloadResponse.messageHandle);
                                }
                                readMessage();
                            },
                            function (err) {
                                //rejected
                                logger.error(err);
                                readMessage();
                            })
                    }
                    readMessage();
                }, function (err) {
                    //rejected
                    logger.error(err);
                    readMessage();
                });
            }
            catch (err) {
                console.dir(err);
                logger.error("Bad message received");
                logger.error(err);
                deleteMessage(data.Messages[0].ReceiptHandle);
                readMessage();
            }
        }
        else {
            readMessage();
        }
    });
}

readMessage();