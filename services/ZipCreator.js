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

function generateDownloadZip(orderItems, outFolder, zipFileName, downloadUrl) {
    var zipArchive, zipOutput, fileStats,
        createZipObj = createZip(outFolder, zipFileName), fullZipPath = path.join(outFolder, zipFileName);
    zipArchive = createZipObj.zip;
    zipOutput = createZipObj.output;
    zipOutput.on("close", function () {
        fileStats = fs.statSync(fullZipPath);
        downloadAlert.downloadComplete(downloadUrl);
        process.exit(0);
    });
    writeZipItems(orderItems, zipArchive).finalize();
}
process.on('message', function (args) {
    generateDownloadZip(args.orderItems, args.outFolder, args.zipFileName, args.downloadUrl);
});