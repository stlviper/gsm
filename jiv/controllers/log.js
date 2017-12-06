/*
 * NOTES : Here are the two sources I used to put this code together
 *  http://stackoverflow.com/questions/21253019/change-a-file-using-node-js
 *  https://coderwall.com/p/ohjerg/read-large-text-files-in-nodejs
 */

var cfg = require('../config'),
  fs = require('fs'),
  logger = require('../utils/logger'),
  path = require('path'),
  readline = require('readline'),
  stream = require('stream');


var _getReadLine = function (filePath) {
  var instream = fs.createReadStream(path.resolve(filePath));
  var outstream = new stream;
  var rl = readline.createInterface(instream, outstream);
  return rl;
};

logController = {};
logController.admin = {};
logController.admin.list = {};
logController.admin.list.get = function (req, res) {
  var logFilePath = path.resolve(cfg.errorLogPath + cfg.errorLogFileName);
  var logIdx = 0; //NOTE : Some Logs don't get IDs
  var renderObj = {
    title: 'Admin Error Logs',
    logs: []
  };
  if (fs.existsSync(logFilePath)) {
    var rl = _getReadLine(logFilePath);

    rl.on('line', function (line) {
      var jsonLogObj = JSON.parse(line);
      jsonLogObj.index = logIdx;
      logIdx += 1;
      renderObj.logs.push(jsonLogObj);
    });
    rl.on('close', function () {
      res.render('logs/error-list', renderObj);
    });
  }
  else {
    renderObj.message = 'No log File currently';
    renderObj.isAlert = true;
    res.render('logs/error-list', renderObj);
  }
};

logController.admin.view = {};
logController.admin.view.get = function (req, res) {
  var rl = _getReadLine(cfg.errorLogPath + cfg.errorLogFileName);
  var renderObj = {
    title: 'Admin View Error Logs',
    log: {}
  };

  var logIdx = 0; //NOTE : Some Logs don't get IDs
  rl.on('line', function (line) {
    var jsonLogObj = JSON.parse(line);
    if (jsonLogObj._id == req.params.id || logIdx == req.params.id) {
      renderObj.log = jsonLogObj;
    }
    logIdx += 1;
  });
  rl.on('close', function () {
    res.render('logs/error-view', renderObj);
  });
};

logController.admin.delete = {};
logController.admin.delete.post = function (req, res) {
  var fs = require('fs');
  fs.closeSync(fs.openSync(path.resolve(cfg.errorLogPath + cfg.errorLogFileName), 'w'));
  logController.admin.list.get(req, res);
};

module.exports = logController;