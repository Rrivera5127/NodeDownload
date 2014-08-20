var express = require('express');
var fs = require("fs");
var archiver = require("archiver");
var request = require("request");
var mkdirp = require("mkdirp");
var sanitizeFilename = require("sanitize-filename");
var config = require("../config");
var path = require("path");
var cp = require("child_process");

var router = express.Router();

var ZIP_EXTENSION = ".zip";
var HOST = "host";


function parseJson(str) {
    var jobj = {};
    try {
        jobj = JSON.parse(str);
    } catch (e) {
        return undefined;
    }
    return jobj;
}
router.post("/", function (req, res, next) {
    if (!req.body || !req.body.orderItems || !req.body.orderItems.length || (!req.body.user && config.requireAgolUser) || !req.body.orderName || !req.body.recipientEmail) {
        return res.jsonp({success: false, message: "Missing or invalid parameters"});
    }
    console.log(typeof req.body.orderItems);
    var zipProcess,
        zipArchive,
        outFolder, zipFileName,
        orderName = req.body.orderName,
        toAddress = req.body.recipientEmail,
        orderItems = (typeof req.body.orderItems) === 'string' ? parseJson(req.body.orderItems) : req.body.orderItems,
      //  user = (typeof req.body.user) ===  'string' ? parseJson(req.body.user) : req.body.user,
        timeStampFolder = new Date().getTime().toString();
    outFolder = path.join(config.zipDirectory, timeStampFolder);
    zipFileName = sanitizeFilename(orderName) + ZIP_EXTENSION;
    try {
        var outputURL = req.protocol + '://' + req.get(HOST) + "/" + config.downloadServiceUrlPart + "/" + timeStampFolder + "/" + zipFileName;
        zipProcess = cp.fork(__dirname + "/../services/ZipCreator");
        zipProcess.send({
            orderItems: orderItems,
            outFolder: outFolder,
            zipFileName: zipFileName,
            downloadUrl: outputURL,
            toAddress:  toAddress
        });
        return res.jsonp({success: true, message: "Your download is being generated"});
    }
    catch (err) {
        return res.jsonp({success: false, message: "Error generating zip file"});
    }
});
module.exports = router;
