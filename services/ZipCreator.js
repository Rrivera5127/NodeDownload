var fs = require("fs");
var archiver = require("archiver");
var request = require("request");
var config = require('../config.dev');
var path = require("path");
var console = require("console");
var logger = config.logger;
var Promise = require("promise");
function createZip(zipJob) {
    var output, zipArchive = archiver("zip");
    output = fs.createWriteStream(zipJob.fullFilePath);
    zipArchive.pipe(output);
    return {zip: zipArchive, output: output};
}
function writeZipItems(orderItems, zipArchive) {
    if (!orderItems) {
        logger.warn("no order items, returning");
        return zipArchive || {finalize: function () {
        }};
    }
    var i, currentOrderItem, currOrderItemName, currOrderItemUrl, currOrderItemServiceName, zipEntryName, currentItemObjectId;
    logger.debug("order item count: " + orderItems.length);
    for (i = 0; i < orderItems.length; i++) {
        if (!orderItems[i]) {
            continue
        }
        currentOrderItem = orderItems[i];
        if (!currentOrderItem) {
            continue;
        }
        currOrderItemName = currentOrderItem.label;
        currentItemObjectId = currentOrderItem.objectId;
        currOrderItemUrl = currentOrderItem.url;
        currOrderItemServiceName = currentOrderItem.serviceName || "";
        if (!currOrderItemName || !currOrderItemUrl) {
            continue;
        }
        //todo check for status codes to make sure of 200
        if (currentItemObjectId || currentItemObjectId === 0) {
            zipEntryName = path.join(currOrderItemServiceName, currentItemObjectId);
        }
        else {
            zipEntryName = currOrderItemServiceName;
        }
        zipEntryName = path.join(zipEntryName, currOrderItemName);
        logger.info("adding zip item from url: " + currOrderItemUrl);
        zipArchive.append(request(currOrderItemUrl), {name: zipEntryName});
    }
    return zipArchive;
}

module.exports.generateZip = function (zipJob) {
    logger.debug("generateDownloadZip");
    return new Promise(function (resolve, reject) {
        var createZipObj = createZip(zipJob);
        createZipObj.output.on("close", function () {
            resolve(zipJob);
        });
        logger.debug("finalize zip");
        writeZipItems(zipJob.orderItems, createZipObj.zip).finalize();
    });
};
