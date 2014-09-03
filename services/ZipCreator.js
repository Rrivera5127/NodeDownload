var fs = require("fs");
var archiver = require("archiver");
var request = require("request");
var config = require('../config.dev');
var path = require("path");
var console = require("console");
var async = require("async");
var temp = require("temp").track();
var logger = config.logger;
var Promise = require("promise");
function createZip(zipJob) {
    var output, zipArchive = archiver("zip");
    output = fs.createWriteStream(zipJob.fullFilePath);
    zipArchive.pipe(output);
    return {zip: zipArchive, output: output};
}
function writeZipItems(orderItems, zipArchive) {
    async.mapSeries(orderItems, function (currentOrderItem, callback) {
        var zipEntryName;
        var currOrderItemName = currentOrderItem.label;
        var currentItemObjectId = currentOrderItem.objectId;
        var currOrderItemUrl = currentOrderItem.url;
        var currOrderItemServiceName = currentOrderItem.serviceName || "";
        if (!currOrderItemName || !currOrderItemUrl) {
            console.log("no item");
            callback(null, {error: true, message: "download item is missing name or url for download"});
        }
        if (currentItemObjectId || currentItemObjectId === 0) {
            zipEntryName = path.join(currOrderItemServiceName, currentItemObjectId);
        }
        else {
            zipEntryName = currOrderItemServiceName;
        }
        zipEntryName = path.join(zipEntryName, currOrderItemName);
        logger.info("adding zip item from url: " + currOrderItemUrl);

        temp.open("dlItem_", function (err, info) {
            var stream = fs.createWriteStream(info.path);
            var req = request(currOrderItemUrl);
            req.on("error", function (err) {
                logger.error("Error in HTTP request for: %s", currOrderItemUrl);
                if (err) {
                    logger.debug(err);
                }
                callback(null, {error: true, message: "Request Error"});
            });
            stream.on("error", function (err) {
                logger.error("Error writing stream to: %s for URL: %s",info.path, currOrderItemUrl);
                if (err) {
                    logger.error(err);
                }
                callback(null, {error: true, message: "Error writing to stream"});
            });
            stream.on("close", function () {
                callback(null, {path: info.path, name: zipEntryName,error:false});
            });
            req.pipe(stream);
        });
    }, function (err, results) {
        logger.debug("download files for zip complete");
        var i, currentResult;
        for (i = 0; i < results.length; i++) {
            currentResult = results[i];
            if (!currentResult || currentResult.error) {
                continue;
            }
            logger.debug("appending %s to zip", currentResult.path);
            zipArchive.append(fs.createReadStream(currentResult.path), { name: currentResult.name });
        }
        logger.debug("finalizing zip");
        zipArchive.finalize();
    });
}

process.on('message', function (zipJob) {
    if (!zipJob) {
        logger.warn("no zip job passed to ZipCreator process. Exiting.");
        process.exit(1);
    }
    else {
        generateZip(zipJob).then(function (err, data) {
            logger.info("zip complete, alerting parent process");
            process.exit(0);
        }, function (err) {
            logger.info("exiting process on reject");
            if(err){
                logger.error(err);
            }
            process.exit(1);
        });
    }
});

function generateZip(zipJob) {
    logger.debug("generateZip. Zip Job:");
    logger.debug(zipJob);
    return new Promise(function (resolve, reject) {
        var createZipObj = createZip(zipJob);
        createZipObj.output.on("close", function () {
            logger.info("zip file closed");
            resolve(null, zipJob);
        });
        logger.debug("writing zip");
        try {
            writeZipItems(zipJob.orderItems, createZipObj.zip);
        }
        catch (err) {
            logger.error("error writing zip");
            logger.error(err);
            reject(err);
        }
    });
}
/*
 var debug = {
 fullFilePath:"C://temp/testFullZip.zip",
 orderItems: [
 {
 "id": "logo11w.png",
 "url": "https://www.godfgrghfhogle.com/images/srpr/logo11w.png",
 "label": "logo11w.png",
 "serviceName": "GOOGLE_SERVICE",
 "size": "16.00 MB"
 },
 {
 "id": "dog.png",
 "url": "http://a.disquscdn.com/next/assets/img/noavatar92.d1dee965677e7cc8d58afe004a6d8282.png",
 "label": "20MB",
 "serviceName": "DOG_SERVICE",
 "size": "16.00 MB"
 }
 ]
 };

 generateZip(debug);

 */
