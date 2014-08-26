"use strict";
var Promise = require("promise");
var AWS = require('aws-sdk');
var config = require('../config.dev');

var ses = new AWS.SES();
var logger = config.logger;
module.exports.alertUser = function (downloadUrl, toAddress) {
    return  new Promise(function (resolve, reject) {
        var params = {
            Destination: {
                ToAddresses: [
                    "rrivera@esri.com"
                ]
            },
            Message: {
                Body: {
                    Html: {
                        Data: '<a href=\'' + downloadUrl + '\'>' + downloadUrl + '</a>', /* required */
                        Charset: 'utf-8'
                    }

                },
                Subject: { /* required */
                    Data: 'Your Download Is Ready', /* required */
                    Charset: 'utf-8'
                }
            },
            Source: 'rrivera@esri.com', /* required */
            ReplyToAddresses: [
                'rrivera@esri.com',
            ]
        };
        ses.sendEmail(params, function (err, data) {
            if (err) {
                logger.error(err);
                reject(new Error("Could not send email"));
            }
            else {
                logger.info("Sent email to %s with link %s", toAddress, downloadUrl);
                logger.debug(data);
            }
            resolve();
        });
    });

};