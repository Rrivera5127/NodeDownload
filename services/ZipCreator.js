var fs = require("fs");
var archiver = require("archiver");
var request = require("request");
var mkdirp = require("mkdirp");
var config = require("../config");
var path = require("path");
var console = require("console");
var downloadAlert = require("./DownloadAlertService");

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
        console.log("no order items, returning");
        return zipArchive || {finalize: function () {
        }};
    }
    var i, currentOrderItem, currOrderItemName, currOrderItemUrl, currOrderItemServiceName, zipName, currentItemObjectId;
    console.log("order item count: " + orderItems.length);
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
            zipName = path.join(currOrderItemServiceName, currentItemObjectId);
        }
        else {
            zipName = currOrderItemServiceName;
        }
        zipName = path.join(zipName, currOrderItemName);
        console.log("adding zip item from url: " + currOrderItemUrl);
        zipArchive.append(request(currOrderItemUrl), {name: zipName});
    }
    return zipArchive;
}

function generateDownloadZip(orderItems, outFolder, zipFileName, downloadUrl, toAddress) {
    console.log("generateDownloadZip");
    var zipArchive, zipOutput,
        createZipObj = createZip(outFolder, zipFileName), fullZipPath = path.join(outFolder, zipFileName);
    zipArchive = createZipObj.zip;
    zipOutput = createZipObj.output;
    zipOutput.on("close", function () {
        downloadAlert.downloadComplete(downloadUrl, toAddress).then(function () {
            process.exit(0);

        });
    });
    writeZipItems(orderItems, zipArchive).finalize();
}
process.on('message', function (args) {
    generateDownloadZip(args.orderItems, args.outFolder, args.zipFileName, args.downloadUrl, args.toAddress);
});