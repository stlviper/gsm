var cfg = require('../config'),
  mongoose = require('mongoose'),
  validator = require('../utils/validation'),
  Schema = mongoose.Schema;

var newsPostSchema = new Schema({
  headline: {type: String, required: true},
  urlFriendlyID: {type: String, required: true, unique: true},
  releaseDate: {type: Date, required: true, default: Date.now},
  publishedBy: {type: String, required: false},
  categories: [{type: String, required: true}],
  content: {type: String, required: true},
  image: {
    name: {type: String, required: false},
    mimetype: {type: String, required: false},
    path: {type: String, required: false},
    date_created: {type: Date, required: false, default: Date.now}
  },
  attachment: {
      name: { type: String, required: false },
      mimetype: { type: String, required: false },
      path: { type: String, required: false },
      date_created: { type: Date, required: false, default: Date.now }
  },
  notificationSent: {type: Boolean, required: true, default: false},
  editedOn: {type: Date, required: true, default: Date.now},
  isPrivate: {type: Boolean, required: true, default: false},
  approved: {type: Boolean, required: true, default: true},
  date_created: {type: Date, required: true, default: Date.now}
});

var validate = function (newsPostObj, callback) {
  if (newsPostObj.image && newsPostObj.image.mimetype && !validator.isValidUploadFileType(newsPostObj.image.mimetype)) {
    callback({message: 'Invalid file type', docLocation: 'News_Image'});
  }
  else {
    callback(null);
  }
};

module.exports = {
  validate: validate,
  schema: newsPostSchema
};