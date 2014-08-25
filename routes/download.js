"use strict";
var express = require('express');
var AWS = require('aws-sdk');
var appConf = require('../config');
var logger = require("../config").logger;
AWS.config.loadFromPath(appConf.awsCredentialsPath);
var sqs = new AWS.SQS();
var router = express.Router();

router.post("/", function (req, res, next) {
    if (!req.body || !req.body.orderItems || !req.body.orderItems.length || (!req.body.user && config.requireAgolUser) || !req.body.orderName || !req.body.recipientEmail) {
        return res.jsonp({success: false, message: "Missing or invalid parameters"});
    }
    logger.debug(JSON.stringify(req.body));
    var params = {
        MessageBody: (typeof req.body.orderItems) === 'string' ? req.body : JSON.stringify(req.body),
        QueueUrl: appConf.sqsQueueUrl,
        DelaySeconds: 0
    };
    // console.log("adding download request to queue");
    sqs.sendMessage(params, function (err, data) {
        if (err) {
            logger.error("failed to add download to queue");
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
