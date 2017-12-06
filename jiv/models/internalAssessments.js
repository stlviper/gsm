var cfg = require('../config'),
  mongoose = require('mongoose'),
  fs = require('fs'),
  challengeModel = require('../models/challenges').model;
  capabilityModel = require('../models/products').model;
  organizationModel = require('../models/organizations').model;
  UploadDocumentSchema = require('../models/uploadDocuments').UploadDocumentSchema,
  UploadDocumentFactory = require('../models/uploadDocuments').creator,
  logger = require('../utils/logger'),
  httpStatus = require('http-status'),
  Schema = mongoose.Schema;

var internalAssessmentSchema = new Schema({
  userId: {type: String, required: true, trim: true},
  overview: {type: String, required: false},
  attachments: [UploadDocumentSchema],
  rating: {type: Number, required: false},
  date_created: {type: Date, required: true, default: Date.now}
});

var internalAssessment = mongoose.model('internalAssessment', internalAssessmentSchema);

var creator = function (registrationId, overview, rating, attachments, locals) {
  // TODO: Figure out why registrationModel is undefined unless it is put inside the function
  //       Check for a circular dependency
  var registrationModel = require('../models/registrations').Registration;

  registrationModel.findOne({'_id': registrationId}, function (registrationErr, registrationDoc) {
    if (registrationErr) {
      logger.error(registrationErr);
      // TODO Finish error handling
    }

    // Create a new internal instance of an assessment and save it in the registration whose id was passed in
    var internalAssessmentInst = new internalAssessment();
    internalAssessmentInst.userId = locals.userinfo.id.toString();
    if (overview) {
      internalAssessmentInst.overview = overview;
    }
    if (rating) {
      internalAssessmentInst.rating = parseInt(rating);
    }
    if (attachments) {
      internalAssessmentInst.attachments = [];
      if (attachments.constructor === Array) {
        for (var i = 0; i < attachments.length; i++) {
          var newDocObj = UploadDocumentFactory(attachments[i].originalname,
                                                attachments[i].mimetype,
                                                cfg.problemDocURL + '/' + attachments[i].name);
          internalAssessmentInst.attachments.push(newDocObj);
        }
      }
      else if (typeof attachments === 'object') {
        var newDocObj = UploadDocumentFactory(attachments.originalname,
                                              attachments.mimetype,
                                              cfg.problemDocURL + '/' + attachments.name);
        internalAssessmentInst.attachments.push(newDocObj);
      }
    }

    registrationDoc.internalAssessments.push(internalAssessmentInst);
    registrationDoc.save( function(saveErr) {
      if (saveErr) {
        logger.error(saveErr);
        // TODO Finish error handling
      }
    });

  });
};

var read = function (registrationId, internalAssessmentId, callback) {
  // TODO: Figure out why registrationModel is undefined unless it is put inside the function
  //       Check for a circular dependency
  var registrationModel = require('../models/registrations').Registration;

  registrationModel.findOne({'_id': registrationId}, function (registrationErr, registrationDoc) {
    if (registrationErr) {
      logger.error(registrationErr);
      // TODO Finish error handling
    }

    capabilityModel.findOne({_id: registrationDoc.productID}, function (capabilityFindErr, capabilityDoc) {
      if (capabilityFindErr) {
        logger.error(capabilityFindErr);
        // TODO Finish error handling
      }
      challengeModel.findOne({'_id': registrationDoc.challengeID}, function (challengeErr, challengeDoc) {
        if (challengeErr) {
          logger.error(challengeErr);
          // TODO Finish error handling
        }
        organizationModel.findOne({'_id': registrationDoc.orgRef}, function (organizationErr, organizationDoc) {
          var renderObj = {};
          if (organizationErr) {
            logger.error(organizationErr);
            renderObj.isAlert = true;
            renderObj.message = 'An Error occurred while retrieving the registration information';
          }

          var internalAssessment = null;
          for (var idx = 0; idx < registrationDoc.internalAssessments.length; idx++) {
            if (internalAssessmentId.toString() === registrationDoc.internalAssessments[idx].id.toString()) {
              internalAssessment = registrationDoc.internalAssessments[idx];
            }
          }

          renderObj = {
            title: 'View Solution Internal Assessment',
            registration: registrationDoc,
            product: capabilityDoc,
            internalAssessment: internalAssessment,
            challenge: challengeDoc,
            organization: organizationDoc
          };
          callback(renderObj)
        })
      });
    });
  });
};

var update = function (registrationId, internalAssessmentId, overview, rating, attachments, locals) {
  // TODO: Figure out why registrationModel is undefined unless it is put inside the function
  //       Check for a circular dependency
  var registrationModel = require('../models/registrations').Registration;

  registrationModel.findOne({'_id': registrationId}, function (registrationErr, registrationDoc) {
    if (registrationErr) {
      logger.error(registrationErr);
      // TODO Finish error handling
    }

    // Find the internal assessment document
    var internalAssessment = null;
    for (var idx = 0; idx < registrationDoc.internalAssessments.length; idx++) {
      if (internalAssessmentId.toString() === registrationDoc.internalAssessments[idx].id.toString()) {
        internalAssessment = registrationDoc.internalAssessments[idx];
      }
    }

    if (overview) {
      internalAssessment.overview = overview;
    }
    if (rating) {
      internalAssessment.rating = parseInt(rating);
    }
    if (attachments) {
      internalAssessment.attachments = [];
      if (attachments.constructor === Array) {
        for (var i = 0; i < attachments.length; i++) {
          var newDocObj = UploadDocumentFactory(attachments[i].originalname,
            attachments[i].mimetype,
            cfg.problemDocURL + '/' + attachments[i].name);
          internalAssessment.attachments.push(newDocObj);
        }
      }
      else if (typeof attachments === 'object') {
        var newDocObj = UploadDocumentFactory(attachments.originalname,
          attachments.mimetype,
          cfg.problemDocURL + '/' + attachments.name);
        internalAssessment.attachments.push(newDocObj);
      }
    }

    registrationDoc.save( function(saveErr) {
      if (saveErr) {
        logger.error(saveErr);
        // TODO Finish error handling
      }
    });

  });
};

var deletor = function (registrationId, internalAssessmentId, callback) {
  // TODO: Figure out why registrationModel is undefined unless it is put inside the function
  //       Check for a circular dependency
  var registrationModel = require('../models/registrations').Registration;

  registrationModel.findOne({'_id': registrationId}, function (registrationErr, registrationDoc) {
    if (registrationErr) {
      logger.error(registrationErr);
      // TODO Finish error handling
      callback(httpStatus.OK, {message: 'No Solution submission with the given ID could be found at this time.', isAlert: true});
    }
    else {
      // Find the internal assessment document
      var isInternalAssessmentRemoved = false;
      for (var idx = 0; idx < registrationDoc.internalAssessments.length; idx++) {
        if (internalAssessmentId.toString() === registrationDoc.internalAssessments[idx].id.toString()) {
          registrationDoc.internalAssessments.splice(idx, 1);
          isInternalAssessmentRemoved = true;
        }
      }

      if (isInternalAssessmentRemoved) {
        registrationDoc.save( function(saveErr) {
          if (saveErr) {
            logger.error(saveErr);
            // TODO Finish error handling
            callback(httpStatus.INTERNAL_SERVER_ERROR, {message: 'The internal assessment could not be saved at this time.', isAlert: true});
          }
          else {
            callback(httpStatus.OK, {message: 'The internal assessment has been deleted successfully.'});
          }
        });
      }
      else {
        callback(httpStatus.OK, {message: 'No internal assessment with the given ID could be found at this time.', isAlert: true});
      }
    }
  });
};

var deleteAttachment = function (registrationDoc, internalAssessmentDoc, attachmentUid, callback) {

  internalAssessmentDoc.attachments.every(function(element, index, array) {
    // Find which attachment has the uid in the path
    var re = new RegExp(attachmentUid);
    if (re.exec(element.path)) {
      // Delete local file
      var filename = element.path.split('/');
      var path = cfg.imageUploadDir+'/'+filename[filename.length-1];
      // NOTE: This does not do an S3 delete
      fs.unlink(path, function (deleteErr) {
        if (deleteErr && deleteErr.code == 'ENOENT') {
          logger.error(deleteErr);
          var msg = {message: 'Deletion Error: The file does not exist.', isAlert: true};
          callback(msg, internalAssessmentDoc.attachments);
        }
        else if (deleteErr) {
          logger.error(deleteErr);
          var msg = {message: 'Deletion Error: The file could not be deleted.', isAlert: true};
          callback(msg, internalAssessmentDoc.attachments);
        }
        else {
          var msg = {message: 'Attachment deleted successfully'};

          // Remove the file from the list
          internalAssessmentDoc.attachments.splice(index, 1);
          callback(msg, internalAssessmentDoc.attachments);
        }
      });
    }
    return false;
  });
};

module.exports = {
  internalAssessment: internalAssessment,
  internalAssessmentSchema: internalAssessmentSchema,
  creator: creator,
  read: read,
  update: update,
  deletor: deletor,
  deleteAttachment: deleteAttachment
};
