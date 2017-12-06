var cfg = require('../config'),
  mongoose = require('mongoose'),
  mongoosastic = require('mongoosastic'),
  logger = require('../utils/logger'),
  docHlpr = require('../utils/documentHelper'),
  validator = require('../utils/validation'),
  httpStatus = require('http-status'),
  path = require('path'),
  fs = require('fs'),
  defaultCustomRegistrationFields = require('../config/defaultRegistrationFields'),
  community = require('../models/communities'),
  communityModel = community.model,
  Schema = mongoose.Schema,
  accountModel = require('../models/accounts').model,
  async = require('async');

var customFieldsSchema = new Schema({
  "label": {type: String, trim: true},
  "field_type": {type: String, trim: true},
  "required": {type: Boolean},
  "field_options": {
    "options": [{
      "label": {type: String, trim: true},
      "checked": {type: Boolean}
    }],
    "include_other_option": {type: Boolean},
    "include_blank_option": {type: Boolean},
    "size": {type: String, trim: true, enum: ['small', 'medium', 'large']},
    "min_max_length_units": {type: String, trim: true, enum: ['words', 'characters']},
    "maxlength": {type: Number},
    "minlength": {type: Number},
    "max": {type: Number},
    "min": {type: Number},
    "units": {type: String, trim: true},
    "description": {type: String, trim: true}
  },
  "cid": {type: String, trim: true}
});

var EventSchema = new Schema({
  startDate: {type: Date, required: false},
  endDate: {type: Date, required: false},
  description: {type: String, required: false, trim: true}
});

var feedbackSchema = new Schema({
  description: {type: String, required: false, trim: true}
});

var discoveryManagerSchema = new Schema ({
userRef: {type: String, required: true, trim: true}
});
var discoveryEvaluatorSchema = new Schema ({
userRef: {type: String, required: true, trim: true}
});
var uploadDocumentJSON = {
  name: {type: String, required: false},
  mimetype: {type: String, required: false},
  path: {type: String, required: false},
  date_created: {type: Date, required: false, default: Date.now}
};
var uploadDocumentSchema = new Schema(uploadDocumentJSON);

var discoverySchema = new Schema({
  approved: {type: Boolean, required: true, default: false},
  name: {type: String, required: true, trim: true, index: {unique: true}},
  orgRef: {type: Schema.Types.ObjectId, required: false},
  pocName: {type: String, required: false, trim: true},
  pocEmail: {type: String, required: false, trim: true},
  description: {type: String, required: true, trim: true},
  categories: [{type: String, required: false, trim: true}],
  thumbnail: uploadDocumentJSON,
  startDate: {type: Date, required: false},
  endDate: {type: Date, required: false},
  stage: {type: String, required: false, default: 'ScopingPreparation'},
  summary: {type: String, required: false, trim: true},
  requirementDescription: {type: String, required: false, trim: true},
  documents: [uploadDocumentSchema],
  schedule: [EventSchema],
  feedbackArea: [feedbackSchema],
  discoveryManagers: [{type: String, required: true, trim: true, unique: true}],
  discoveryEvaluators: [{type: String, required: false, trim: true, unique: true}],
  scoringScale: {type: String, required: false},
  evaluationCriteria: {type: String, required: false},
  date_created: {type: Date, required: true, default: Date.now},
  registrationDescription: {type: String, required: false, trim: true},
  addProduct: {type: Boolean, default: true, required: true},
  addWhitepaper: {type: Boolean, default: true, required: true},
  customRegistrationFields: [customFieldsSchema],
  regEndDate: {type: Date, required: false},
  isDraft: {type: Boolean, required: false}
});

var problem = mongoose.model('challenges', discoverySchema);

var validate = function (problemObj, callback) {
  if (!problemObj.name || !problemObj.description
    || !problemObj.startDate || !problemObj.startDate || !problemObj.endDate || !problemObj.discoveryManagers || !problemObj.orgRef) {
    callback({message: 'Please fill out all fields'});
  }

  if (validator.isToManyWords(problemObj.description, 200000)) { // NOTE Requested to be increased from 200 to "infinity" by Bill Hughes
    callback({message: 'The description has to many words.'});
    return;
  }

  if (problemObj.documents.length > 5) {
    callback({message: 'Can only upload 5 documents.'});
    return;
  }
  if (problemObj.documents){
  for (var i = 0; i < problemObj.documents.length; i++) {
      console.log(problemObj.documents[i].mimetype);
    if (!validator.isValidUploadFileType(problemObj.documents[i].mimetype)) {
      callback({message: 'Invalid file type'});
      return;
    }
  }
}
  callback();
};

var creator = function (newProblem, callback) {

  validate(newProblem, function (err) {
    if (err) {
      if (newProblem.documents.length > 0){
        newProblem.documents.forEach(function(element, index, array) {
          // Get the guid and create a string of the local path
          var filename = element.path.split('/');
          var path = cfg.imageUploadDir+'/'+filename[filename.length-1];
          element = null;

          fs.unlink(path, function (delErr) {
            if (delErr) {
              logger.error(delErr);
              callback({message: 'There was an error with your request.'});
            }
            else {
              callback({message: 'Invalid file type'});
            }
          });
        });
      }else{
        callback({message: err.message});
      }
    }
    else {
      newProblem.customRegistrationFields = defaultCustomRegistrationFields;
      newProblem.save(function (err) {
        var errMsg = null;
        if (err) {
          logger.error(err);
          callback({
            message: 'Error occurred while trying to save your capability. Please try again at another time.'
          }, newProblem);
        }
        else {
          callback(errMsg, newProblem);
        }
      });
    }
  });
};

var update = function (id, name, orgRef, pocName, pocEmail, description, requirement, dayCount,
                       documents, startdate, evaluationCriteria, summary, stage, category, endDate, regEndDate, thumbnail,
                       managers, evaluators, scoringScale, isDraft, callback) {
  problem.findOne({_id: id}, function (findErr, problemDoc) {
    if (findErr) {
      logger.error(findErr);
      callback({message: 'Error Occurred while looking for the Problem.'});
    }
    else {
      problemDoc.name = name;
      problemDoc.orgRef = orgRef;
      problemDoc.pocName = pocName;
      problemDoc.pocEmail = pocEmail;
      problemDoc.description = description;
      problemDoc.requirementDescription = requirement;
      problemDoc.dayCount = dayCount || 0;
      problemDoc.startDate = startdate;
      problemDoc.endDate = endDate;
      problemDoc.evaluationCriteria = evaluationCriteria;
      problemDoc.summary = summary;
      problemDoc.stage = stage;
      problemDoc.regEndDate = regEndDate;
      problemDoc.categories = category ? category.split(",") : [];
      problemDoc.discoveryEvaluators = evaluators ? evaluators.split(", ") : [];
      problemDoc.discoveryManagers = managers ? managers.split(", ") : problemDoc.discoveryManagers;
      problemDoc.scoringScale = scoringScale;
      problemDoc.isDraft = isDraft;

      if (documents) {
        if (documents.constructor === Array) {
          for (var i = 0; i < documents.length; i++) {
            var docObj = {
              name: documents[i].originalname,
              mimeType: documents[i].mimetype,
              path: cfg.problemDocURL + '/' + documents[i].name
            };
            problemDoc.documents.push(docObj);
          }
        }
        else if (typeof documents === 'object') {
          var docObj = {
            name: documents.originalname,
            mimetype: documents.mimetype,
            path: cfg.problemDocURL + '/' + documents.name
          };
          problemDoc.documents.push(docObj);
        }
      }

      if (thumbnail) {
        var mimeType = thumbnail.match(/(image\/.*);/)[1];
        var extension = thumbnail.match(/image\/(.*);/)[1];
        if (cfg.validUploadMimeTypes.indexOf(mimeType) > -1) {
          var thumbNailName = 'discovery_thumbnail_' + problemDoc.id + '.' + extension;
          var path = '/images/' + thumbNailName;
          problemDoc.thumbnail = {name: thumbNailName, mimetype: mimeType, path: path, date_created: new Date()};
          docHlpr.saveDataUrl(cfg.imageUploadDir + '/discovery_thumbnail_' + problemDoc.id, thumbnail);
        }
      }
      validate(problemDoc, function (validateErr) {
        if (validateErr) {
          callback({message: validateErr.message}, problemDoc);
          return;
        }
        problemDoc.save(function (saveErr) {
          if (saveErr) {
            callback({message: 'Cannot save your solution at this time.'}, problemDoc);
            return;
          }
            callback(undefined, problemDoc);
        });
      });
    }
  });
};

var remove = function (id, callback) {
  problem.findOneAndRemove({'_id': id}, function (err, doc) {
    communityModel.find({discoveries: id}, function (error, communityDoc) {
      for (var i = 0; i < communityDoc.length; i++) {
        var problemID = communityDoc[i].discoveries.indexOf(id);
        if (problemID > -1) {
          communityDoc[i].discoveries.splice(problemID, 1);
        }
        communityDoc[i].save(function (saveErr) {
          if (saveErr) {
            logger.error(saveErr);
          }
        });
      }
      if (err) {
        logger.error(err);
        callback(err, doc);
      }
      else if (!doc) {
        callback({message: 'No Problem matches this ID'}, null);
      }
      else {
        // NOTE: This has to be require() here in order to avoid circular dependency issues.
        var registrations = require('./registrations').Registration;
        registrations.find({'challengeID': doc._id}).remove(function (err, regDocs) {
          if (err) {
            logger.error(err);
          }
        });
        callback(null, doc);
      }
    });
  });
};

var removeDocument = function (docID, problemId, callback) {
  if (docID && problemId) {
    problem.findOne({_id: problemId}, function (err, problemDoc) {
      if (err) {
        logger.error(err);
        callback({
          status: httpStatus.INTERNAL_SERVER_ERROR,
          results: {message: 'Can not process your information at this time'}
        });
      }
      else if (!problemDoc) {
        callback({
          status: httpStatus.NOT_FOUND,
          results: {message: 'No Problem matched this information'}
        });
      }
      else {
        var idx = -1;
        var imagePath = '';
        for (var i = 0; i < problemDoc.documents.length; i++) {
          var item = problemDoc.documents[i];
          if (item.id === docID) {
            idx = i;
            imagePath = item.path;
            break;
          }
        }
        if (idx > -1) {
          problemDoc.documents.splice(idx, 1);
          problemDoc.save(function (saveErr) {
            if (saveErr) {
              logger.error(saveErr);
              callback({
                status: httpStatus.INTERNAL_SERVER_ERROR,
                results: {message: 'Cannot process your information at this time'}
              });
            }
            else {
              docHlpr.removeResourceDocument(cfg.problemDocDir + '/' + path.basename(imagePath), function (removeErr) {
                if (removeErr) {
                  logger.error(removeErr);

                  callback({
                    status: httpStatus.INTERNAL_SERVER_ERROR,
                    results: {message: 'Error Occurred while attempting to remove your document'}
                  });
                }
                else {
                  callback({
                    status: httpStatus.ACCEPTED,
                    results: {message: 'Document Removed'}
                  });
                }
              });
            }
          });
        }
        else {
          callback({
            status: httpStatus.NOT_FOUND,
            results: {message: 'No document matches that ID'}
          });
        }
      }
    });
  }
  else {
    callback({
      status: httpStatus.NOT_FOUND,
      results: {message: 'Not Enough Information to find item.'}
    });
  }
};

var addDate = function (problemId, startDate, endDate, description, callback) {
  problem.findOne({_id: problemId}, function (err, problemDoc) {
    if (err) {
      logger.error(err);
      callback({
        status: httpStatus.INTERNAL_SERVER_ERROR,
        results: {message: 'Cannot process your information at this time'}
      });
    }
    else if (!problemDoc) {
      callback({
        status: httpStatus.NOT_FOUND,
        results: {message: 'No Problem matched this information'}
      });
    }
    else {
      if (!problemDoc.schedule) {
        problemDoc.schedule = [];
      }
      var newDateObj = {};
      newDateObj.startDate = startDate;
      newDateObj.endDate = endDate || null;
      newDateObj.description = description;
      problemDoc.schedule.push(newDateObj);
      problemDoc.save(function (saveErr, updatedDoc) {
        if (saveErr) {
          logger.error(saveErr);
          callback({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            results: {message: 'Cannot process your information at this time'}
          });
        }
        else {
          callback({
            status: httpStatus.ACCEPTED,
            results: {message: 'Date Added', event: updatedDoc.schedule[updatedDoc.schedule.length-1]}
          });
        }
      });
    }
  });
};

var removeDate = function (problemId, eventID, callback) {
  problem.findOne({_id: problemId}, function (err, problemDoc) {
    if (err || !problemDoc) {
      logger.error(err);
      callback({
        status: !problemDoc ? httpStatus.NOT_FOUND : httpStatus.INTERNAL_SERVER_ERROR,
        results: {
          message: !problemDoc ? 'No Problem matches the given information' : 'Cannot process your information at this time'
        }
      });
    }
    else {
      var idx = -1;
      for (var i = 0; i < problemDoc.schedule.length; i++) {
        var item = problemDoc.schedule[i];
        if (item._id.toString() === eventID.toString()) {
          idx = i;
          break;
        }
      }
      if (idx > -1) {
        problemDoc.schedule.splice(idx, 1);
      }
      problemDoc.save(function (saveErr) {
        if (saveErr) {
          logger.error(saveErr);
          callback({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            results: {message: 'Cannot process your information at this time'}
          });
        }
        else {
          callback({
            status: httpStatus.ACCEPTED,
            results: {message: 'Date Removed', dates: problemDoc.schedule}
          });
        }
      });
    }
  });
};

var addFeedback = function (problemId, description, callback) {
  problem.findOne({_id: problemId}, function (err, problemDoc) {
    if (err) {
      logger.error(err);
      callback({
        status: httpStatus.INTERNAL_SERVER_ERROR,
        results: {message: 'Cannot process your information at this time'}
      });
    }
    else if (!problemDoc) {
      callback({
        status: httpStatus.NOT_FOUND,
        results: {message: 'No Problem matched this information'}
      });
    }
    else {
      if (!problemDoc.feedbackArea) {
        problemDoc.feedbackArea = [];
      }
      var newFeedbackObj = {};
      newFeedbackObj.description = description;
      problemDoc.feedbackArea.push(newFeedbackObj);
      problemDoc.save(function (saveErr) {
        if (saveErr) {
          logger.error(saveErr);
          callback({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            results: {message: 'Cannot process your information at this time'}
          });
        }
        else {
          callback({
            status: httpStatus.ACCEPTED,
            results: {message: 'Feedback Added', dates: problemDoc.feedbackArea}
          });
        }
      });
    }
  });
};

var removeFeedback = function (problemId, description, callback) {
  problem.findOne({_id: problemId}, function (err, problemDoc) {
    if (err || !problemDoc) {
      logger.error(err);
      callback({
        status: !problemDoc ? httpStatus.NOT_FOUND : httpStatus.INTERNAL_SERVER_ERROR,
        results: {
          message: !problemDoc ? 'No Problem matches the given information' : 'Cannot process your information at this time'
        }
      });
    }
    else {
      var idx = -1;
      for (var i = 0; i < problemDoc.feedbackArea.length; i++) {
        var item = problemDoc.feedbackArea[i];
        if (item.description === description) {
          idx = i;
          break;
        }
      }
      if (idx > -1) {
        problemDoc.feedbackArea.splice(idx, 1);
      }
      problemDoc.save(function (saveErr) {
        if (saveErr) {
          logger.error(saveErr);
          callback({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            results: {message: 'Cannot process your information at this time'}
          });
        }
        else {
          callback({
            status: httpStatus.ACCEPTED,
            results: {message: 'Date Removed', dates: problemDoc.feedbackArea}
          });
        }
      });
    }
  });
};

// Remove the user from discoveryManagers of all discoveries
var removeProblemManager = function(userId, callbackA) {
  problem.find({discoveryManagers: userId}, function(discErr, discoveries) {
    async.each(discoveries, function(disc, callbackB) {
      // Remove userId from list
      var userIndex = disc.discoveryManagers.indexOf(userId);
      disc.discoveryManagers.splice(userIndex, 1);
      // If there are now 0 discoveryManagers, assign all organizationManagers to be the discoveryManagers
      if(disc.discoveryManagers.length === 0) {
        accountModel.find({orgRef: disc.orgRef, roles: "organizationManager"}, function(accountErr, accounts) {
          async.each(accounts, function(account, callbackC) {
            disc.discoveryManagers.push(account._id.valueOf());
            account.roles.push("discoveryManager");
            disc.save(function(err) {
              account.save(function(err) {
                callbackC();
              });
            });
          }, function(err) {
            callbackB();
          });

        });
      }
      else {
        disc.save(function(err) {
          callbackB();
        });
      }
    }, function(err) {
      callbackA();
    });
  });
};

module.exports = {
  model: problem,
  creator: creator,
  update: update,
  validate: validate,
  removeDocument: removeDocument,
  addDate: addDate,
  addFeedback: addFeedback,
  removeFeedback: removeFeedback,
  removeDate: removeDate,
  remove: remove,
  removeProblemManager: removeProblemManager
};
