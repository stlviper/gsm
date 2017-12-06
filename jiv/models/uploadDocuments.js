var cfg = require('../config'),
  mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var uploadDocumentSchema = new Schema({
  name: {type: String, required: true},
  mimetype: {type: String, required: true},
  path: {type: String, required: true},
  date_created: {type: Date, required: true, default: Date.now}
});

var uploadDocument = mongoose.model('uploadDocument', uploadDocumentSchema);
var creator = function (name, mimeType, path, callback) {
  var newUploadDoc = new uploadDocument();
  newUploadDoc.name = name;
  newUploadDoc.mimetype = mimeType;
  newUploadDoc.path = path;
  if (callback) {
    callback(null, newUploadDoc);
    return;
  }
  else {
    return newUploadDoc;
  }
};

module.exports = {
  UploadDocumentSchema: uploadDocumentSchema,
  UploadDocument: uploadDocument,
  creator: creator
};