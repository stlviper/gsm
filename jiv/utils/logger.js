var winston = require('winston'),
  cfg = require('../config'),
  util = require('util'),
  uuid = require('node-uuid'),
  s3StreamLogger = require('s3-streamlogger').S3StreamLogger;
require('winston-logstash-udp');
//require('winston-logstash');

var aws = require('aws-sdk');
var awsCredentials = {};
if (process.env.NODE_ENV === 'local' && cfg.logToS3) {
  try {
    awsCredentials = aws.config.loadFromPath('../aws_credentials.json');
  }
  catch (err) {
    console.log('No AWS credentials were found.');
    console.log(err);
  }
}
else {
  awsCredentials = {
    accessKeyId: aws.config.accessKeyId,
    secretKeyId: aws.config.secretAccessKey
  }
}

winston.cli();
winston.emitErrs = true;

var _mergeObjects = function (obj1, obj2) {
  var returnObj = {};
  for (var attr in obj1) {
    returnObj[attr] = obj1[attr];
  }
  for (var attr in obj2) {
    returnObj[attr] = obj2[attr];
  }
  return returnObj;
};

var _getLogMetaData = function () {
  var metaData = {_id: uuid.v4()};
  return metaData;
};

var CustomLogger = function (options) {
  CustomLogger.super_.apply(this, arguments);
};
util.inherits(CustomLogger, winston.Logger);
CustomLogger.prototype.log = function () {
  var args = Array.prototype.slice.call(arguments);
  var metaData = _getLogMetaData();
  args[3] = _mergeObjects((args[3] || {}), metaData);
  CustomLogger.super_.prototype.log.call(this, args[0], args[2] || args[1], args[3]);
};

var logger = new CustomLogger();

if (process.env.NODE_ENV !== 'production-gsm') {
  logger.add(winston.transports.Console, {
    name: 'development-transport',
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
    exitOnError: false
  });
}


var _infoTransport = {
  name: 'infoLogFiles-transport',
  level: 'info',
  filename: cfg.infoLogPath + cfg.infoLogFileName,
  handleExceptions: true,
  json: true,
  maxsize: 5242880, //5MB
  maxFiles: 5,
  colorize: false,
  exitOnError: false
};
var _errorFileTransport = {
  name: 'errorLogFiles-transport',
  level: 'error',
  filename: cfg.infoLogPath + cfg.errorLogFileName,
  handleExceptions: true,
  json: true,
  maxsize: 5242880, //5MB
  maxFiles: 5,
  colorize: false,
  exitOnError: false
};

// This is used for getting the logs to S3 since a beanstalk restart will drop them
if (cfg.logToS3) {
  var s3StreamError = new s3StreamLogger({
    bucket: cfg.s3LogBucket,
    access_key_id: awsCredentials.accessKeyId,
    secret_access_key: awsCredentials.secretAccessKey,
    rotate_every: 86400000, //milliseconds
    upload_every: 15000, //milliseconds
    max_file_size: 5000000 //bytes
  });
  var _s3StreamError = {
    name: 's3-stream-error',
    stream: s3StreamError,
    level: 'error',
    handleExceptions: true,
    json: true,
    exitOnError: false
  };
  logger.add(winston.transports.File, _s3StreamError);
  
  var s3StreamInfo = new s3StreamLogger({
    bucket: cfg.s3LogBucket,
    access_key_id: awsCredentials.accessKeyId,
    secret_access_key: awsCredentials.secretAccessKey,
    rotate_every: 86400000, //milliseconds
    upload_every: 15000, //milliseconds
    max_file_size: 5000000 //bytes
  });
  var _s3StreamInfo = {
    name: 's3-stream-info',
    stream: s3StreamInfo,
    level: 'info',
    handleExceptions: false,
    json: true,
    exitOnError: false
  };
  logger.add(winston.transports.File, _s3StreamInfo);
}

logger.add(winston.transports.File, _infoTransport);
logger.add(winston.transports.File, _errorFileTransport);


if (process.env.NODE_ENV === 'production-eb') {

// UPD verions of logstash (make sure to check require statements to enable)
  logger.add(winston.transports.LogstashUDP, {
    port: 9999,
    appName: 'GSM_production_udp',
    host: '10.0.0.159',
    level: 'info',
    handleExceptions: true,
    json: true,
    colorize: false,
    exitOnError: false
  });

// TCP verions of logstash (make sure to check require statements to enable)
  /*logger.add(winston.transports.Logstash, {
   port: 9999,
   appName: 'GSM_production_tcp',
   host: '10.0.0.159'
   });*/
}

logger.cli();

logger.stream = {
  write: function (message, encoding) {
    logger.info(message.slice(0, -1));
  }
};

module.exports = logger;