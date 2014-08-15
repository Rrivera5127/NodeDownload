var path = require('path');
var config = {};
config.zipDirectory = path.join(__dirname,"downloads");
config.downloadServiceUrlPart = "downloadService";
module.exports = config;