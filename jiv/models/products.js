var cfg = require('../config'),
  mongoose = require('mongoose'),
  mongoosastic = require('mongoosastic'),
  logger = require('../utils/logger'),
  validator = require('../utils/validation'),
  stringHelpers = require('../utils/stringHelpers'),
  organizations = require('../models/organizations').model,
  path = require('path'),
  Schema = mongoose.Schema;

var solutionSchema = new Schema({
  name: {type: String, required: true, trim: true, index: {unique: true}},
  urlFriendlyID: {type: String, required: true, trim: true},
  orgRef: {type: Schema.Types.ObjectId, required: false},
  pocName: {type: String, required: true, trim: true},
  pocEmail: {type: String, required: true, trim: true},
  description: {type: String, required: true, trim: true},
  date_created: {type: Date, required: true, default: Date.now},
  date_updated: {type: Date, required: false, default: Date.now},
  category: [{type: String, required: false, default: ""}],
  webLink: {type: String, required: false, trim: true, default: ""},
  approved: {type: Boolean, required: false, default: false},
  logoUrl: {type: String, required: false, trim: true, default: ""},
  trlLevel: {type: String, required: false, trim: true, default: ""},
  newCapabilityLastNotificationDay: {type: Date, required: false}
});

solutionSchema.plugin(mongoosastic, {host: String(cfg.es.uri)});

var capability = mongoose.model('product', solutionSchema);

// Updated the timestamp whenever an update is called
solutionSchema.pre('save', function(done) {
  this.date_updated = new Date();
  done();
});

var creator = function (approved, name, orgRef, pocName, pocEmail, description, categories, webLink, logoFile, callback) {

  var newCapability = new capability();
  newCapability.approved = approved;
  newCapability.name = name;
  newCapability.urlFriendlyID = stringHelpers.getUrlFriendlyString(name);
  newCapability.orgRef = orgRef;
  newCapability.pocName = pocName;
  newCapability.description = description;
  newCapability.category = categories;
  newCapability.pocEmail = pocEmail;
  newCapability.webLink = webLink;

  if (logoFile) {
    newCapability.logoUrl = logoFile;
  }
  validate(newCapability, function (valErr, capabilityDoc) {
    if (valErr) {
      callback(valErr, capabilityDoc);
    }
    else {
      organizations.findOne({_id: capabilityDoc.orgRef}, function (err, org) {
        if (err) {
          callback({message: 'Error in organization lookup.'});
        } else if (!org) {
          callback({message: 'Organization provided was not found in the database.'});
        } else {
          newCapability.save(function (saveErr) {
            if (saveErr) {
              logger.error(saveErr);
              callback({message: 'Cannot process your request at this time'}, newCapability);
              return;
            }
            callback(null, newCapability);
          });
        }
      });
    }
  });
};

var update = function (capabilityId, approved, name, orgRef, pocName, pocEmail, description, categories, webLink, logoFile, callback) {
  capability.findOne({_id: capabilityId}, function (findErr, capabilityDoc) {
    if (!capabilityDoc) {
      callback({message: 'No capability found'}, null);
    }
    else {
      capabilityDoc.approved = approved;
      capabilityDoc.name = name;
      capabilityDoc.orgRef = orgRef;
      capabilityDoc.pocName = pocName;
      capabilityDoc.description = description;
      capabilityDoc.category = categories;
      capabilityDoc.pocEmail = pocEmail;
      capabilityDoc.webLink = webLink;
      validate(capabilityDoc, function (valErr, objDoc) {
        if (valErr) {
          callback(err, objDoc);
        }
        else {
          capabilityDoc.save(function (saveErr) {
            callback(saveErr, objDoc);
          });
        }
      });
    }
  });
};

var validate = function (capabilityDoc, callback) {
  if (!validator.isValidEmailAddress(capabilityDoc.pocEmail)) {
    callback({message: 'Invalid email address'}, capabilityDoc);
  }
  else if (!validator.isValidWebLink(capabilityDoc.webLink)) {
    callback({message: 'Invalid web link'}, capabilityDoc);
  }
  else if (!capabilityDoc.name || !capabilityDoc.orgRef || !capabilityDoc.webLink || !capabilityDoc.description
    || !capabilityDoc.pocName || !capabilityDoc.pocEmail) {
    callback({message: 'Please fill out all required fields'}, capabilityDoc);
  }
  else {
    var re = /^http:\/\//i;
    if(!re.test(capabilityDoc.webLink)){
      capabilityDoc.webLink = 'http://'+capabilityDoc.webLink;
    }
    callback(null, capabilityDoc);
  }
};

module.exports = {
  model: capability,
  creator: creator,
  update: update,
  validate: validate
};