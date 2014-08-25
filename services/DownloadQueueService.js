"use strict";
var AWS = require('aws-sdk');
var sanitizeFilename = require("sanitize-filename");
var appConf = require('../config');
var Promise = require("promise");
var path = require("path");
AWS.config.loadFromPath(appConf.awsCredentialsPath);
var sqs = new AWS.SQS();
var cp = require('child_process');
var logger = appConf.logger;

var ZIP_EXTENSION = ".zip";
var currentDownloadCount = 0;

function deleteMessage(handle) {
    logger.info("deleteMessage: %s", handle);
    sqs.deleteMessage({
        "QueueUrl": appConf.sqsQueueUrl,
        "ReceiptHandle": handle
    }, function (err, data) {
        if (!err) {
        }
        else {
        }
    });
}
function initDownload(downloadParameters, messageHandle) {
    var
        zipProcess,
        zipArchive,
        outFolder, zipFileName,
        orderName = downloadParameters.orderName,
        toAddress = downloadParameters.recipientEmail,
        orderItems = (typeof downloadParameters.orderItems) === 'string' ? JSON.parse(downloadParameters.orderItems) : downloadParameters.orderItems,
    //  user = (typeof downloadParameters.user) ===  'string' ? parseJson(downloadParameters.user) : downloadParameters.user,
        timeStampFolder = new Date().getTime().toString();
    outFolder = path.join(appConf.zipDirectory, timeStampFolder);
    zipFileName = sanitizeFilename(orderName) + ZIP_EXTENSION;
    return new Promise(function (resolve, reject) {
        try {
            var outputURL = appConf.downloadHost.protocol + '://' + appConf.downloadHost + (appConf.downloadHost.port ? (":" + appConf.downloadHost.port) : "") + "/" + appConf.downloadServiceUrlPart + "/" + timeStampFolder + "/" + zipFileName;
            logger.info("Creating download: %s", outputURL);
            zipProcess = cp.fork(__dirname + "/../services/ZipCreator");
            zipProcess.on("exit", function () {
                resolve(messageHandle);
            });
            zipProcess.send({
                orderItems: orderItems,
                outFolder: outFolder,
                zipFileName: zipFileName,
                downloadUrl: outputURL,
                toAddress: toAddress
            });
        }
        catch
            (err) {
            reject(err);
        }
    });
}
function readMessage() {
    logger.debug("read message");
    sqs.receiveMessage({
        "QueueUrl": appConf.sqsQueueUrl,
        "MaxNumberOfMessages": 1,
        "VisibilityTimeout": 30,
        "WaitTimeSeconds": 20
    }, function (err, data) {
        var sqs_message_body, bodyAsJson;
        logger.debug("current downloads: %s", currentDownloadCount);
        if (data && data.Messages && (typeof data.Messages[0] !== 'undefined' && typeof data.Messages[0].Body !== 'undefined') && (currentDownloadCount < appConf.maxParallelDownloads)) {
            //sqs msg body
            logger.info("Servicing: " + data.Messages[0].MessageId);
            currentDownloadCount++;
            try {
                sqs_message_body = data.Messages[0].Body;
                bodyAsJson = JSON.parse(sqs_message_body);
                initDownload(bodyAsJson, data.Messages[0].ReceiptHandle).then(function (messageHandle) {
                    //completed. todo: check to make sure all files were zipped
                    deleteMessage(messageHandle);
                    currentDownloadCount--;
                    readMessage();
                }, function (err) {
                    //rejected
                    currentDownloadCount--;
                    readMessage();
                });
                if (currentDownloadCount < appConf.maxParallelDownloads) {
                    readMessage();
                }
            }
            catch (err) {
                logger.error("Bad message received");
                logger.error(err);
                currentDownloadCount--;
                deleteMessage(data.Messages[0].ReceiptHandle);
            }
        }
        else {
            readMessage();
        }
    });
}
readMessage();