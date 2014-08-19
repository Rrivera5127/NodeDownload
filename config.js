var path = require('path');
var config = {};
config.zipDirectory = path.join(__dirname, "downloads");
config.downloadServiceUrlPart = "downloadService";

config.email = {
    alertFromAddress: "emailService@34098230398.com",
    smtp: {
        server: "smtp.gmail.com",
        port: 465
    }
};

module.exports = config;

