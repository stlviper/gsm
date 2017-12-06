var cfg = require('../config'),
  mongoose = require('mongoose'),
  fs = require('fs'),
  UploadDocumentSchema = require('../models/uploadDocuments').UploadDocumentSchema,
  UploadDocumentFactory = require('../models/uploadDocuments').creator,
  logger = require('../utils/logger'),
  Schema = mongoose.Schema;

var feedbackAreas = new Schema({
  response: {type: String, required: false},
  feedbackRef: {type: String, required: false}
});

var feedbackSchema = new Schema({
  isDraft: {type: Boolean, required: true, default: false},
  isRead: {type: Boolean, required: true, default: false},
  summary: {type: String, required: false},
  feedbackDoc: {type: Object, required: false},
  otherDocuments: [UploadDocumentSchema],
  feedbackAreas: [feedbackAreas],
  date_submitted: {type: Date, required: false},
  date_created: {type: Date, required: true, default: Date.now}
});

var feedback = mongoose.model('feedback', feedbackSchema);
var validate = function(newFeedbackDoc, callback){
  var valErr = null;
  if(callback){
    callback(valErr, newFeedbackDoc);
  }
};
var creator = function (regDoc, isDraft, isRead, summary, feedbackDoc, otherDocuments, feedbackAreas, callback) {
  var newFeedBack = new feedback();
  newFeedBack.isDraft = isDraft;
  if (!newFeedBack.isDraft) {
    newFeedBack.date_submitted = new Date().getTime();
  }
  newFeedBack.isRead = isRead;
  newFeedBack.summary = summary;
  newFeedBack.feedbackAreas = feedbackAreas;
  if (feedbackDoc) {
    var newFeedbackDoc = UploadDocumentFactory(feedbackDoc.originalname,
      feedbackDoc.mimeType,
      cfg.problemDocURL + '/' + feedbackDoc.name);
    newFeedBack.feedbackDoc = newFeedbackDoc.toObject();
  }

  if (otherDocuments) {
    if (otherDocuments.constructor === Array) {
      for (var i = 0; i < otherDocuments.length; i++) {
        var newDocObj = UploadDocumentFactory(
          otherDocuments[i].originalname,
          otherDocuments[i].mimetype,
          cfg.problemDocURL + '/' + otherDocuments[i].name
        );
        newFeedBack.otherDocuments.push(newDocObj);
      }
    }
    else if (typeof otherDocuments === 'object') {
      var newDocObj = UploadDocumentFactory(
        otherDocuments.originalname,
        otherDocuments.mimetype,
        cfg.problemDocURL + '/' + otherDocuments.name
      );
      newFeedBack.otherDocuments.push(newDocObj);
    }
  }

  regDoc.feedback.push(newFeedBack);
  regDoc.save(function (saveErr) {
    var callbackErr = null;
    if (saveErr) {
      logger.error(saveErr);
      callbackErr = {message: saveErr.message || 'Cannot process your feedback at this time.'};
    }
    if (callback) {
      callback(callbackErr, newFeedBack, regDoc);
    }
  });

};

var update = function (regDoc, challDoc, parameters, callback) {
  if (typeof callback !== 'function') {
    return;
  }
  var callbackErr = {message: 'No feedback are currently in draft'};
  for (var idx in regDoc.feedback) {
    // This assumes there can only be one feedback in draft at a time
    if (regDoc.feedback[idx].isDraft) {
      // Use typeof check since isDraft is a boolean
      if (typeof parameters.isDraft !== 'undefined') {
        regDoc.feedback[idx].isDraft = parameters.isDraft;
        if (!regDoc.feedback[idx].isDraft) {
          regDoc.feedback[idx].date_submitted = new Date().getTime();
        }
      }
      if (parameters.summary) {
        regDoc.feedback[idx].summary = parameters.summary;
      }
	    if (parameters.date_created) {
        regDoc.feedback[idx].date_created = parameters.date_created;
      }
      if (typeof parameters.isRead !== 'undefined') {
        regDoc.feedback[idx].isRead = parameters.isRead;
      }
      if (parameters.feedbackDoc) {
        regDoc.feedback[idx].feedbackDoc = UploadDocumentFactory(parameters.feedbackDoc.originalname,
                                           parameters.feedbackDoc.mimeType,
                                           cfg.problemDocURL + '/' + parameters.feedbackDoc.name);
        regDoc.feedback[idx].feedbackDoc = regDoc.feedback[idx].feedbackDoc.toObject();
      }
      if (parameters.otherDocuments) {
        if (parameters.otherDocuments.constructor === Array) {
          for (var idxOtherDocuments in parameters.otherDocuments) {
            var newDocObj = UploadDocumentFactory(
              parameters.otherDocuments[idxOtherDocuments].originalname,
              parameters.otherDocuments[idxOtherDocuments].mimetype,
              cfg.problemDocURL + '/' + parameters.otherDocuments[idxOtherDocuments].name
            );
            regDoc.feedback[idx].otherDocuments.push(newDocObj);
          }
        }
        else if (typeof parameters.otherDocuments === 'object') {
          var newDocObj = UploadDocumentFactory(
            parameters.otherDocuments.originalname,
            parameters.otherDocuments.mimetype,
            cfg.problemDocURL + '/' + parameters.otherDocuments.name
          );
          regDoc.feedback[idx].otherDocuments.push(newDocObj);
        }
      }
      if(parameters.feedbackAreas) {
        for (var idxFeedbackAreas in parameters.feedbackAreas) {
          var idxFeedbackRef = -1;
          idxFeedbackRef = regDoc.feedback[idx].feedbackAreas.map(function(tmp){return tmp.feedbackRef;}).indexOf(parameters.feedbackAreas[idxFeedbackAreas].feedbackRef);
          if (idxFeedbackRef > -1) {
            regDoc.feedback[idx].feedbackAreas[idxFeedbackRef].response = parameters.feedbackAreas[idxFeedbackAreas].response;
            regDoc.markModified('feedback');
          }
          else {
            regDoc.feedback[idx].feedbackAreas.push({'feedbackRef':parameters.feedbackAreas[idxFeedbackAreas].feedbackRef, 'response': parameters.feedbackAreas[idxFeedbackAreas].response});
          }
        }
      }

      regDoc.save(function (saveErr) {
        if (saveErr) {
          logger.error(saveErr);
          callbackErr = {message: saveErr.message || 'Cannot process your feedback at this time.'};
        }
        else {
          callbackErr = {};
        }
      });
    }
  }
  callback(callbackErr, regDoc);
};

var removeFeedbackDocument = function (regDoc, feedbackId, feedbackDocName, callback) {
  regDoc.feedback.forEach(function(element, index, array) {
    if (element._id.toString() === feedbackId) {
      if (element.feedbackDoc.name === feedbackDocName) {
        // Get the guid and create a string of the local path
        var filename = element.feedbackDoc.path.split('/');
        var path = cfg.imageUploadDir+'/'+filename[filename.length-1];
        element.feedbackDoc = null;
        regDoc.save(function (saveErr) {
          if (saveErr) {
            logger.error(err);
            //callback({message: 'Error occurred while trying to delete the feedback document. Please try again at another time.'});
          }
          else {
            fs.unlink(path, function (delErr) {
              if (delErr) {
                logger.error(delErr);
                /*callback({message: 'There was an error deleting the file from the file system. Please contact a GSM' +
                                ' representative if you want to ensure that the file has been permanently removed.'});*/
              }
              else {
                //callback({message: 'Feedback document deleted successfully.'});
              }
            });
          }
        });
      } 
      else {
        //callback({message: 'No feedback item was deleted.'});
      }
    } 
    else {
      //callback({message: 'No feedback item was deleted.'});
    }
  });
  callback({message: 'In progress...'});
};

var removeOtherDocument = function (regDoc, feedbackId, otherDocName, callback) {
  regDoc.feedback.forEach(function(element, index, array) {
    if (element._id.toString() === feedbackId) {
      element.otherDocuments.forEach( function(otherDoc, idx, arr) {
        if (otherDoc.name === otherDocName) {
          element.otherDocuments.splice(idx, 1);
          // Get the guid and create a string of the local path
          var filename = otherDoc.path.split('/');
          var path = cfg.imageUploadDir+'/'+filename[filename.length-1];
          regDoc.save(function (saveErr) {
            if (saveErr) {
              logger.error(err);
              //callback({message: 'Error occurred while trying to delete the document. Please try again at another time.'});
            } 
            else {
              fs.unlink(path, function (delErr) {
                if (delErr) {
                  logger.error(delErr);
                  /*callback({message: 'There was an error deleting the file from the file system. Please contact a GSM' +
                                  ' representative if you want to ensure that the file has been permanently removed.'});*/
                }
                else {
                  //callback({message: 'Document deleted successfully.'});
                }
              });
            }
          });
        }
      });
    } else {
      //callback({message: 'No document was deleted.'});
    }
  });
  callback({message: 'In progress...'});
};

module.exports = {
  Feedback: feedback,
  FeedbackSchema: feedbackSchema,
  creator: creator,
  update: update,
  removeFeedbackDocument: removeFeedbackDocument,
  removeOtherDocument: removeOtherDocument
};
