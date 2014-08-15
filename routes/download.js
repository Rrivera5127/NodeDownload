var express = require('express');
var fs = require("fs");
var archiver = require("archiver");
var request = require("request");
var mkdirp = require("mkdirp");
var sanitizeFilename = require("sanitize-filename");
var config = require("../config");
var path = require("path");
var filesize = require("filesize");
var router = express.Router();

var ZIP_EXTENSION = ".zip";
var HOST = "host";

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
        return zipArchive || {finalize: function () {
        }};
    }
    var i, currOrderItemName, currOrderItemUrl, currOrderItemServiceName;
    for (i = 0; i < orderItems.length; i++) {
        if (!orderItems[i]) {
            continue
        }
        currOrderItemName = orderItems[i].label;
        currOrderItemUrl = orderItems[i].url;
        currOrderItemServiceName = orderItems[i].serviceName || "";
        if (!currOrderItemName || !currOrderItemUrl) {
            continue;
        }
        zipArchive.append(request(currOrderItemUrl), {name: path.join(currOrderItemServiceName, currOrderItemName)});
    }
    return zipArchive;
}

router.post("/", function (req, res, next) {
    if (!req.body || !req.body.orderItems || !req.body.orderItems.length || !req.body.user || !req.body.orderName) {
        next(new Error("Invalid or missing parameters"));
    }
    var i, createZipObj, zipOutput, fileStats, zipArchive, fullZipPath, outFolder, zipFileName, outputPath, orderName = req.body.orderName, orderItems = req.body.orderItems, user = req.body.user, timeStampFolder = new Date().getTime().toString();
    outFolder = path.join(config.zipDirectory, timeStampFolder);
    zipFileName = sanitizeFilename(orderName) + ZIP_EXTENSION;
    fullZipPath = path.join(outFolder, zipFileName);
    try {
        createZipObj = createZip(outFolder, zipFileName);
        zipArchive = createZipObj.zip;
        zipOutput = createZipObj.output;
        zipOutput.on("close", function () {
            var outputURl = req.protocol + '://' + req.get(HOST) + "/" + config.downloadServiceUrlPart + "/" + timeStampFolder + "/" + zipFileName;
            fileStats = fs.statSync(fullZipPath);
            return res.jsonp({success: true, url: outputURl, size: filesize(fileStats['size'])});
        });
        writeZipItems(orderItems, zipArchive).finalize();
    }
    catch (err) {
        next(err || new Error("Could not write zip file"));
    }
});
module.exports = router;
