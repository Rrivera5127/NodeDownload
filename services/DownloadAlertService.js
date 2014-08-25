"use strict";
var simplesmtp = require("simplesmtp");
var Promise = require("promise");
var config = require("../config");
/**
 * Send a raw email
 *
 * @param {String} from E-mail address of the sender
 * @param {String|Array} to E-mail address or a list of addresses of the receiver
 * @param {[type]} message Mime message
 */
function mail(from, to, message) {
    var client = simplesmtp.connect(config.email.smtp.port, config.email.smtp.server, {
        secureConnection: true,
        auth: {
            user: 'email@gmail.com',
            pass: 'password'
        },
        debug: true
    });
    client.once('idle', function () {
        client.useEnvelope({
            from: from,
            to: [].concat(to || [])
        });
    });

    client.on('message', function () {
        client.write(message.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..'));
        client.end();
    });

    client.on('ready', function (success) {
        client.quit();
    });

    client.on('error', function (err) {
    });

    client.on('end', function () {
    });
    return client;
}

module.exports.downloadComplete = function (downloadUrl,toAddress) {
    return  new Promise(function (resolve, reject) {
        resolve();
        /*
        var mailClient = mail(config.email.alertFromAddress, toAddress, ("Your download is ready: " + downloadUrl));
        mailClient.on("error", function () {
            // console.log("Email sent");
            resolve();
        });
        mailClient.on("end", function () {
            // console.log("Email failed");
            reject();
        });
        */
    });

};