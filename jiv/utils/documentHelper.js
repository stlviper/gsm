var cfg = require('../config'),
  logger = require('../utils/logger'),
  fs = require('fs');

var documentHelper = {};

documentHelper.removeResourceDocument = function (path, callback) {
  fs.exists(path, function (exists) {
    if (exists) {
      fs.unlink(path, function (err) {
        if (err) {
          logger.error(err);
        }
        if (callback) {
          callback();
        }
      });
    }
    else if (callback) {
      callback({message: 'No resource exists at that path.'});
    }
  });
};


documentHelper.saveDataUrl = function(fileName, dataUrl) {
  var dataString = dataUrl.split(",")[1];
  var buffer = new Buffer(dataString, 'base64');
  var extension = dataUrl.match(/\/(.*)\;/)[1];
  var fs = require("fs");
  var fullFileName = fileName + "." + extension;
  fs.writeFileSync(fullFileName, buffer, "binary");

  if (cfg.useS3) {
    // TODO: Investigate: Can the buffer be used as the Body parameter to avoid the write to disk?
    fs.readFile(fullFileName, function (err, data) {
      var fileName = fullFileName.split("/");
      fileName = fileName[fileName.length - 1];

      params = {
        Bucket: cfg.privateHostPath,
        Key: cfg.privateDirectoryPath + '/' + fileName,
        Body: data
      };

      cfg.s3.putObject(params, function (err, res) {
        if (err) {
          logger.error('File upload ' + fileName + ' failed.');
        }
        else {
          // Delete the file saved locally
          //fs.unlink(fullFileName);
          logger.info(fullFileName + ' uploaded to  ' + params.Key);
        }
      });
      logger.info(data.length + ' of ' + fullFileName + ' arrived');
    })
  }
};

documentHelper.getDataFromS3 = function(req, res, path) {

  var options = {
      root: cfg.imageUploadDir+'/',
      dotfiles: 'deny',
      headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
      }
  };

  if (cfg.useS3) {
    var aws = require('aws-sdk');

    var params = {
      Bucket: strings.PrivateUploadsDirectoryFullPrefixPath,
      Key: req.params.filename
    };

    cfg.s3.headObject(params, function (err, metadata) {
      if (err && err.code === 'NotFound') {
        // Handle no object in S3 here
        require('fs').stat(cfg.imageUploadDir + '/' + req.params.filename, function (err, stat) {
          if (err) {
            options.root = './public';
            res.sendFile('/images/logo-default.png', options);
          } else {
            res.sendFile(req.params.filename, options);
          }
        });
      }
      else {
        var file = require('fs').createWriteStream(cfg.imageUploadDir+'/' + req.params.filename);
        cfg.s3.getObject(params).createReadStream().pipe(file).on('finish', function(){
          res.sendFile(req.params.filename, options);
        });
      }
    });
  }
  else {
    res.sendFile(req.params.filename, options);
  }
};

// This is strictly for Mitre and their request to recieve the files as human readable
documentHelper.mitreGetDataFromS3 = function(req, res) {

  var options = {
    root: cfg.imageUploadDir+'/',
    dotfiles: 'deny',
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true
    }
  };

  if (cfg.useS3) {
    var aws = require('aws-sdk');

    var params = {
      Bucket: strings.PrivateUploadsDirectoryFullPrefixPath,
      Key: req.params.filename
    };

    cfg.s3.headObject(params, function (err, metadata) {
      if (err && err.code === 'NotFound') {
        // Handle no object in S3 here
        require('fs').stat(cfg.imageUploadDir + '/' + req.params.filename, function (err, stat) {
          if (err) {
            options.root = './public';
            res.sendFile('/images/logo-default.png', options);
          } else {
            res.sendFile(req.params.filename, options);
          }
        });
      }
      else {
        var file = require('fs').createWriteStream(cfg.imageUploadDir+'/' + req.params.filename);
        cfg.s3.getObject(params).createReadStream().pipe(file).on('finish', function(){
          res.sendFile(req.params.filename, options);
        });
      }
    });
  }
  else {
    res.setHeader('Content-disposition', 'attachment; filename=' + req.params.humanreadablefilename);
    res.sendFile(req.params.filename, options);
  }
};

documentHelper.handleFileUpload = function (file) {
  var processedDocument;
  if (file === Array) {
    processedDocument = [];
    for (var i = 0; i < file.length; i++) {

      var docObj = {
        name: documents[i].originalname,
        mimeType: documents[i].mimetype,
        path: cfg.problemDocURL + '/' + documents[i].name
      };
      processedDocument.push(docObj);
    }
  }
  else if (typeof file === 'object') {

    processedDocument = {
      mimetype: file.mimetype,
      name: file.originalname,
      path: cfg.problemDocURL + '/' + file.name
    };
  }
  return processedDocument;
};

module.exports = documentHelper;
