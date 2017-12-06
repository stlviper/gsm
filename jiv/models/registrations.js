var cfg = require('../config'),
  UploadDocumentSchema = require('./uploadDocuments').UploadDocumentSchema,
  FeedbackSchema = require('./feedback').FeedbackSchema,
  InternalAssessmentSchema = require('./internalAssessments').internalAssessmentSchema,
  ChallengeModel = require('./challenges').model,
  CapabilityModel = require('./products').model,
  mongoose = require('mongoose'),
  fs = require('fs'),
  mongoosastic = require('mongoosastic'),
  logger = require('../utils/logger'),
  validator = require('../utils/validation'),
  Schema = mongoose.Schema;

var customFieldResponseSchema = new Schema({
  fieldId: {type: Schema.Types.ObjectId, required: true},
  response: {type: String, trim: true, required: true},
  fieldType: {type: String, trim: true, required: true}
});
var registrationSchema = new Schema({
  challengeName: {type: String, required: false, trim: true},
  challengeID: {type: String, required: true, trim: true},
  productName: {type: String, required: false, trim: true},
  productID: {type: String, required: false, trim: true},
  orgRef: {type: Schema.Types.ObjectId, required: false},
  pocName: {type: String, required: false, trim: true},
  pocEmail: {type: String, required: false, trim: true},
  description: {type: String, required: false, trim: true},
  accessInstructions: {type: String, require: false},
  otherDocuments: [UploadDocumentSchema],
  feedback: [FeedbackSchema],
  internalAssessments: [InternalAssessmentSchema],
  customFieldResponse: [customFieldResponseSchema],
  whitepaper: {type: Object, required: false},
  date_created: {type: Date, required: true, default: Date.now},
  date_updated: {type: Date, required: false, default: Date.now}
});

registrationSchema.plugin(mongoosastic, {host: String(cfg.es.uri)});

var registration = mongoose.model('registration', registrationSchema);

var validate = function (newRegObj, isNew, callback) {
  if (!newRegObj.orgRef) {

    callback({message: 'Please fill out all fields'});
    return;
  }
  if (newRegObj.accessInstructions && validator.isToManyWords(newRegObj.accessInstructions, 200)) {
    callback({message: 'The instructions must be less than 200 words'});
    return;
  }
  if (newRegObj.otherDocuments) {
    for (var i = 0; i < newRegObj.otherDocuments.length; i++) {
      if (!validator.isValidUploadFileType(newRegObj.otherDocuments[i].mimetype)) {
        callback({message: 'is an invalid file type', docLocation: 'otherDocuments'});
        return;
      }
    }
  }
  if (newRegObj.whitepaper) {
    if (!validator.isValidUploadFileType(newRegObj.whitepaper.mimetype)) {
      callback({message: 'is an invalid file type', docLocation: 'whitepaper'});
      return;
    }
  }
  if (isNew) {
    if (newRegObj.productID) {
      registration.findOne({
        productID: newRegObj.productID,
        orgRef: newRegObj.orgRef,
        challengeID: newRegObj.challengeID
      }, function (err, regDocs) {
        if (err) {
          logger.error(err);
          callback({message: 'Could not process your request at this time.'});
        }
        else if (regDocs) {
          callback({message: 'This capability is already registered for this Problem'});
        }
        else {
          callback(null, newRegObj);
        }
      });
    }

    else {
      callback(null, newRegObj);
    }
  }
  else {
    callback(null, newRegObj);
  }
};

var creator = function (newRegObj, callback) {

  validate(newRegObj, true, function (err) {
    if (err) {

      if (err.message == 'is an invalid file type') {
        // Get the guid and create a string of the local path
        var errMessage = "";
        if (err.docLocation == 'whitepaper') {
          var filename = newRegObj.whitepaper.path.split('/');
          errMessage = "Invalid file type whitepaper";
        } else {
          for (var i = 0; i < newRegObj.otherDocuments.length; i++) {
            var filename = newRegObj.otherDocuments[i].path.split('/');
            errMessage = "Invalid file type otherDocuments";
          }

        }
        var path = cfg.imageUploadDir + '/' + filename[filename.length - 1];
        index = null;
        fs.unlink(path, function (delErr) {
          if (delErr) {
            logger.error(delErr);
            callback({message: 'There was an error with your request.'});
          }
          else {
            callback({message: errMessage});
          }
        });
      } else {
        callback({message: err.message});
      }
    } else {
      CapabilityModel.findOne({_id: newRegObj.productID}, function (capabilityFindErr, capabilityDoc) {
        ChallengeModel.findOne({_id: newRegObj.challengeID}, function (challengeErr, challengeDoc) {
          if (newRegObj.productID && capabilityDoc) {
            newRegObj.productName = capabilityDoc.name;
          }
          newRegObj.challengeName = challengeDoc.name;
          newRegObj.save(function (err) {
            var errMsg = null;
            if (err) {
              logger.error(err);
              errMsg = {message: 'Error occurred while trying to save your capability. Please try again at another time.'};
            }
            callback(errMsg, newRegObj);
          });
        });
      });
    }
  });
};

var update = function (regID, updateFields, callback) {
  var conditions = {_id: regID},
    options = {multi: false};
  validate(updateFields, false, function (err) {
    if (err) {
      callback({message: err.message}, updateFields);
    }
    else {
      updateFields.date_updated = new Date();
      registration.update(conditions, updateFields, options, function (updateErr, updatedDoc) {
        if (updateErr) {
          callback({message: err.message}, updateFields);
        }
        else {
          callback(null, updatedDoc);
        }
      });
    }
  });
};

var removeDocument = function (registrationID, documentName, callback) {
  registration.findOne({_id: registrationID}, function (err, regDoc) {
    if (err) {
      logger.error(err);
      callback({message: 'Error occurred while '});
    }
    if (!regDoc) {
      callback({message: 'No registration for that ID'});
    }
    var docIdx = -1;
    var doc = regDoc.otherDocuments.forEach(function (element, index) {
      if (element.name === documentName) {
        docIdx = index;
      }
    });
    if (docIdx > -1) {
      regDoc.otherDocuments.splice(docIdx, 1);
    }

    validate(regDoc, false, function (validateErr) {
      if (validateErr) {
        callback({message: err.message}, regDoc);
        return;
      }
      regDoc.save(function (saveErr) {
        var errMsg = null;
        if (saveErr) {
          logger.error(err);
          errMsg = {message: 'Error occurred while trying to save your capability. Please try again at another time.'};
        }
        callback(errMsg, regDoc);
      });
    });
  });
};

var removeWhitepaper = function (registrationID, callback) {
  registration.findOne({_id: registrationID}, function (err, regDoc) {
    if (err) {
      logger.error(err);
      if (callback) {
        callback({message: 'Error occurred while '});
      }
    }
    regDoc.whitepaper = null;

    validate(regDoc, false, function (validateErr) {
      if (validateErr) {
        if (callback) {
          callback({message: err.message}, regDoc);
        }
        return;
      }
      regDoc.save(function (saveErr) {
        var errMsg = null;
        if (saveErr) {
          logger.error(err);
          errMsg = {message: 'Error occurred while trying to save your capability. Please try again at another time.'};
        }
        if (callback) {
          callback(errMsg, regDoc);
        }
      });
    });
  });
};

module.exports = {
  Registration: registration,
  creator: creator,
  update: update,
  validate: validate,
  removeDocument: removeDocument,
  removeWhitepaper: removeWhitepaper
};
