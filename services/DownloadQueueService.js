"use strict";
var AWS = require('aws-sdk');
var fs = require("fs");
var sanitizeFilename = require("sanitize-filename");
var config = require('../config');
var Promise = require("promise");
var uuid = require('node-uuid');
var path = require("path");
var util = require("util");
var S3UploadService = require("./UploaderService");
var DownloadAlertService = require("./DownloadAlertService");
var cp = require('child_process');
var DBService = require("./DBService");
var sqs = new AWS.SQS();
var logger = config.logger;
var ZIP_EXTENSION = ".zip";

var currentDownloads = 0;
var runningZipJobs = {};

function deleteMessage(handle) {
    sqs.deleteMessage({
        "QueueUrl": config.sqsUrl,
        "ReceiptHandle": handle
    }, function (err, data) {
        if (err) {
            logger.error(err,util.format("Could not delete message with handle %s", handle));
        }
        else {
            logger.info("deleted message");
        }
    });
}
function createZipJob(messageJson, receiptHandle, messageId) {
    return new Promise(function (resolve, reject) {
        //create zip job
        if (!receiptHandle || !messageJson.dbItemId || !messageJson.orderName || !messageJson.orderItems || !messageJson.orderItems.length || !messageJson.recipientEmail || !config.zipDirectory || !config.s3 || (!config.s3.bucketUrlPrefix && config.s3.bucketUrlPrefix !== 0)) {
            reject(new Error("Invalid or missing message parameters"));
            return;
        }
        //make sure message hasn't already been serviced
        var dbItem = DBService.getDownloadItem(messageJson.dbItemId).then(function (dbItem) {
            //resolve
            if(!dbItem || dbItem.userAlerted){
                //either the item isnt in dynamo or the user has already been alerted of the zip.
                //there is a case we need to handle where the zip has been created but the user could not be emailed about the zip file. This might need to just result in an error flag in the DB with deletion from S3
                reject(new Error(dbItem ? "Message has already been processed and the user has been notified. deleting SQS message" : "Item was not found in the database. Deleting."));
                return;
            }
            var guid = uuid.v1();
            var sanitizedFileName = sanitizeFilename(messageJson.orderName);
            var zipJob = {
                zipFileName: util.format("%s-%s%s", sanitizedFileName, guid, ZIP_EXTENSION),
                s3UploadZipKey: util.format("%s/%s%s", guid, sanitizedFileName, ZIP_EXTENSION),
                orderItems: (typeof messageJson.orderItems) === 'string' ? JSON.parse(messageJson.orderItems) : messageJson.orderItems,
                recipientEmail: messageJson.recipientEmail,
                messageHandle: receiptHandle,
                messageId: messageId,
                outFolder: config.zipDirectory,
                dbItemId: messageJson.dbItemId
            };
            zipJob.fullFilePath = path.join(zipJob.outFolder, zipJob.zipFileName);
            zipJob.outputURL = config.s3.bucketUrlPrefix + config.s3.downloadBucketPath + "/" + zipJob.s3UploadZipKey;
            resolve(zipJob);
        }, function (err) {
            //reject
            reject(err);
        });
    });
}
function messageProcessingComplete(zipJob) {
    if (zipJob && runningZipJobs[zipJob.messageId]) {
        delete runningZipJobs[zipJob.messageId];
    }
    currentDownloads--;
    readMessage();
}
function processZipJob(zipJob) {
    //download the requested files locally into a zip
    runningZipJobs[zipJob.messageId] = zipJob;
    currentDownloads++;
    var zipProcess = cp.fork(__dirname + "/../services/ZipCreator");
    zipProcess.on("exit", function (err) {
        if (err) {
            messageProcessingComplete();
            //todo: should probably send a SQS message to a error listener service that can check into why the zip creation failed
        }
        logger.info("parent process alerted");
        if (fs.existsSync(zipJob.fullFilePath)) {
            logger.info("uploading zip job %s to S3", zipJob.messageId);
            S3UploadService.uploadFile(zipJob.fullFilePath, zipJob.s3UploadZipKey).then(function (data) {
                    // resolved
                    if (data) {
                        DBService.setDownloadItemZipCreated(zipJob.dbItemId);
                        logger.info("alerting user that  zip job %s is ready for download", zipJob.messageId);
                        DownloadAlertService.alertUser(zipJob.outputURL, zipJob.recipientEmail).then(function () {
                                //resolved
                                DBService.setDownloadItemUserAlerted(zipJob.dbItemId);
                                logger.info("email successfully send to %s", zipJob.recipientEmail);
                                deleteMessage(zipJob.messageHandle);
                            },
                            function () {
                                //rejected
                                //todo: need to send an alert that the zip was created successfully but the email failed to send to the user
                                logger.error("There was an error sending download link to email address: %s", zipJob.recipientEmail);
                            });
                        //todo need to check for email success
                    }
                    messageProcessingComplete(zipJob);
                },
                function (err) {
//                    rejected
                    logger.error(err,util.format("error alerting user for zip job %s", zipJob.messageId));
                    messageProcessingComplete(zipJob);
                })
        }
        else {
            logger.error("zip process did not generate zip");
            messageProcessingComplete();
        }
    });
    logger.debug("sending zip job to zip child process");
    zipProcess.send(zipJob);
}
function readMessage() {
    sqs.receiveMessage({
        "QueueUrl": config.sqsUrl,
        "MaxNumberOfMessages": 1,
        "VisibilityTimeout": 30,
        "WaitTimeSeconds": 1
    }, function (err, data) {
        if (currentDownloads >= config.maxDownloadProcesses) {
            return;
        }
        var bodyAsJson;
        //make sure the SQS message has enough info
        if (data && data.Messages && (typeof data.Messages[0] !== 'undefined' && typeof data.Messages[0].Body !== 'undefined')) {
            var messageHandle = data.Messages[0].ReceiptHandle;
            var messageId = data.Messages[0].MessageId;
            if (!messageId || runningZipJobs[messageId]) {
                if (messageId) {
                    logger.info("message %s is already being processed, skipping", messageId);
                }
                readMessage();
            }
            logger.info("Servicing: %s", messageId);
                bodyAsJson = JSON.parse(data.Messages[0].Body);
                var zipJob = createZipJob(bodyAsJson, messageHandle, messageId).then(
                    function (zipJob) {
                        processZipJob(zipJob);
                        if (currentDownloads < config.maxDownloadProcesses) {
                            readMessage();
                        }
                    },
                    function (err) {
                            logger.error(err,"Bad message received");
                        deleteMessage(messageHandle);
                        readMessage();
                    }
                )
            }
        else {
            readMessage();
        }

    });
}
module.exports.startListener = readMessage;