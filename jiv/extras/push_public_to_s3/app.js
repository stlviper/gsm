// IMPORTANT!!!!!!!!!!!!!!!!!!!!!!!!!
// On the machine this is run on use:
// cmd> ulimit -n 2560
// before running this script
// IMPORTANT!!!!!!!!!!!!!!!!!!!!!!!!!

// Example
/*cd /home/ci_user/deploy/jiv/extras/push_public_to_s3
npm install
ulimit -n 2560
node app.js jivango-public development/public*/

var s3 = require('s3');
var fs = require('fs');
var dive = require('dive');
var aws = require('aws-sdk');

var awsCredentials = {};
try {
  // This is where bamboo is looking
  awsCredentials = JSON.parse(fs.readFileSync('../../aws_credentials.json', 'utf8'));
}
catch (err) {
  // This is where the servers are looking
  awsCredentials = JSON.parse(fs.readFileSync('../../../aws_credentials.json', 'utf8'));
}

var client = s3.createClient({
  maxAsyncS3: 20,     // this is the default
  s3RetryCount: 3,    // this is the default
  s3RetryDelay: 1000, // this is the default
  multipartUploadThreshold: 20971520, // this is the default (20 MB)
  multipartUploadSize: 15728640, // this is the default (15 MB)
  s3Options: {
    accessKeyId: awsCredentials.accessKeyId,
    secretAccessKey: awsCredentials.secretAccessKey
  }
});

// Get all of the files in all of the subdirectories
require('process').chdir('../../public');
var publicDirectory = require('process').cwd();
require('process').chdir('../extras/push_public_to_s3');

dive(publicDirectory, {all: true}, function(err, file) {
  if (err){ throw err; }
  else {
    var remote_loc = file.substring(publicDirectory.length, file.length);

    var params = {
      localFile: file,

      s3Params: {
        Bucket: process.argv[2],
        Key: process.argv[3] + remote_loc
      }
    };

    var uploader = client.uploadFile(params);

    uploader.on('error', function(err) {
      console.error("unable to upload:", err.stack);
    });

    /*uploader.on('progress', function() {
      console.log("progress", uploader.progressMd5Amount,
        uploader.progressAmount, uploader.progressTotal);
    });*/

    /*uploader.on('end', function() {
      console.log("done uploading");
    });*/
  }
}, function() {
  console.log('upload started');
});
