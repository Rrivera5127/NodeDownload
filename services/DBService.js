'use strict';
var AWS = require('aws-sdk');
var config = require('../config');
var Promise = require("promise");
var uuid = require("node-uuid");
var util = require("util");
var attr = require('dynamodb-data-types').AttributeValue;
var attrUpdate = require('dynamodb-data-types').AttributeValueUpdate;

var dynamodb = new AWS.DynamoDB();
var logger = config.logger;


function updateDownloadItem(downloadId, updates) {
    dynamodb.updateItem({
        'TableName': config.dynamoDb.table,
        'Key': attr.wrap({downloadId: downloadId}),
        'AttributeUpdates': updates
    }, function (err, data) {
        if (err) {
            logger.error(err,util.format("Could not update downloadId %s", downloadId));
        }
        else {
            logger.info("Updated downloadId %s", downloadId);
        }
    });
}
module.exports.getDownloadItem = function (downloadId) {
    return new Promise(function (resolve, reject) {
        var params = {
            Key: {
                "downloadId": {
                    "S": downloadId
                }
            },
            "TableName": config.dynamoDb.table,
            "ConsistentRead": true,
            "ReturnConsumedCapacity": "NONE"
        };
        dynamodb.getItem(params, function (err, data) {
            if (err || !data || !data.Item) {
                reject();
            }
            else {
                resolve(attr.unwrap(data.Item));
            }
        });
    });
};


module.exports.setDownloadItemZipCreated = function (downloadId) {
    logger.info("updated DB for zip created on downloadId %s", downloadId);
    var updates = attrUpdate
        .put({created: 1});
    updateDownloadItem(downloadId, updates);
};


module.exports.setDownloadItemUserAlerted = function (downloadId) {
    logger.info("updated DB for user alert on downloadId %s", downloadId);
    var updates = attrUpdate
        .put({userAlerted: 1});
    updateDownloadItem(downloadId, updates);
};

module.exports.addDownloadRequest = function (downloadRequest) {
    return new Promise(function (resolve, reject) {
        console.log("adding download request to DB");
        var downloadId = uuid.v1();
        dynamodb.putItem({
            'TableName': config.dynamoDb.table,
            'Item': attr.wrap(
                {
                    request: JSON.stringify(downloadRequest),
                    timestamp: new Date().getTime(),
                    downloadId: downloadId,
                    created: 0,
                    userAlerted: 0
                })

        }, function (err, data) {
            if (err) {
                logger.error(err,"There was an error writing download item to DB");
                reject(err);
            }
            else {
                logger.info("Wrote download item to DB");
                resolve(downloadId);
            }
        });
    });
};