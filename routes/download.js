"use strict";
var express = require('express');
var AWS = require('aws-sdk');
var config = require('../config.dev');
var logger = config.logger;
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
    var params = {
        MessageBody: JSON.stringify(parametersAsObj),
        QueueUrl: config.sqsUrl,
        DelaySeconds: 0
    };

    // console.log("adding download request to queue");
    sqs.sendMessage(params, function (err, data) {
        if (err) {
            logger.error("failed to add download to queue");
            logger.error(err);
            return res.jsonp({success: false, message: "Could not process download request"});
        }
        else {
            logger.info("successfully added download to queue");
            logger.debug(data);
            return res.jsonp({success: true, message: "Processing request"});
        }
    });
});
module.exports = router;
