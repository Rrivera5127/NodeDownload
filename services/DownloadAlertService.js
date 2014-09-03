"use strict";
var Promise = require("promise");
var AWS = require('aws-sdk');
var config = require('../config.dev');
var ses = new AWS.SES();
var logger = config.logger;
module.exports.alertUser = function (downloadUrl, toAddress) {
    return new Promise(function (resolve, reject) {
        var params = {
            Destination: {
                ToAddresses: [
                    toAddress
                ]
            },
            Message: {
                Body: {
                    Html: {
                        Data: config.email.contentTemplate ? config.email.contentTemplate.replace(/\$DOWNLOAD_URL\$/g, downloadUrl) : '<a href=\'' + downloadUrl + '\'>' + downloadUrl + '</a>',
                        Charset: config.email.encoding || "utf-8"
                    }
                },
                Subject: { /* required */
                    Data: config.email.subject, /* required */
                    Charset: config.email.encoding || "utf-8"
                }
            },
            Source: config.email.fromAddress,
            ReplyToAddresses: [
                config.email.replyToAddress
            ]
        };
        ses.sendEmail(params, function (err, data) {
            if (err) {
                logger.error("Error sending email");
                logger.error(err);
                reject(err);
            }
            else {
                logger.info("Sent email to %s with link %s", toAddress, downloadUrl);
                logger.debug(data);
            }
            resolve();
        });
    });

};