var fs = require("fs");
var archiver = require("archiver");
var request = require("request");
var mkdirp = require("mkdirp");
var config = require('../config.dev');
var path = require("path");
var console = require("console");
var logger = config.logger;

function createZip(outputFolder, zipName) {
    var outputPath, output, zipArchive = archiver("zip");
    mkdirp(outputFolder, function (err) {
        if (err) {
            throw err;
        }
    });
    outputPath = path.join(outputFolder, zipName);
    output = fs.createWriteStream(outputPath);
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

function generateDownloadZip(zipJob) {
    logger.debug("generateDownloadZip");
    var createZipObj = createZip(zipJob);
    createZipObj.output.on("close", function () {
        logger.debug("zip archive closed");
        process.exit(0);
    });
    logger.debug("finalize zip");
    writeZipItems(zipJob.orderItems, createZipObj.zip).finalize();
}
process.on('message', function (args) {
    generateDownloadZip(args.outFolder, args.zipFileName);
});