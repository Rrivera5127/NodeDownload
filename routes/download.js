"use strict";
var express = require('express');
var AWS = require('aws-sdk');
var DBService = require("../services/DBService");
var config = require('../config');
var logger = config.logger;
var util = require("util");
AWS.config.loadFromPath(config.awsCredentialsPath);
var sqs = new AWS.SQS();
var router = express.Router();

router.post("/", function (req, res, next) {
    if (!req.body || !req.body.orderItems || !req.body.orderItems.length || (!req.body.user && config.requireAgolUser) || !req.body.orderName || !req.body.recipientEmail) {
        return res.jsonp({success: false, message: "Missing or invalid parameters"});
    }
    var parametersAsObj = {
        orderItems: req.body.orderItems,
        recipientEmail: req.body.recipientEmail,
        orderName: req.body.orderName
    };
    if (req.body.user) {
        parametersAsObj.user = req.body.user;
    }

    DBService.addDownloadRequest(parametersAsObj).then(function (downloadId) {
        parametersAsObj.dbItemId = downloadId;
        var params = {
            MessageBody: JSON.stringify(parametersAsObj),
            QueueUrl: config.sqsUrl,
            DelaySeconds: 0
        };
        //resolve
        // console.log("adding download request to queue");
        sqs.sendMessage(params, function (err, data) {
            if (err) {
                logger.error(err,"failed to add download to queue");
                return res.jsonp({success: false, message: "Could not process download request"});
            }
            else {
                logger.debug(data,"successfully added download to queue");
                return res.jsonp({success: true, message: "Processing request"});
            }
        });
    }, function (err) {
        logger.error(err,"Could not write download job to DB");
        return res.jsonp({success: false, message: "Your download could not be processed"});
    });


});
module.exports = router;
