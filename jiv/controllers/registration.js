var registrationModel = require('../models/registrations').Registration,
  registrationUpdater = require('../models/registrations').update,
  internalAssessmentModule = require('../models/internalAssessments');
  capabilityModel = require('../models/products').model,
  organizationModel = require('../models/organizations').model,
  problemModel = require('../models/challenges').model,
  feedbackFactory = require('../models/feedback').creator,
  feedbackUpdate = require('../models/feedback').update,
  feedbackRemoveFeedbackDocument = require('../models/feedback').removeFeedbackDocument,
  feedbackRemoveOtherDocument = require('../models/feedback').removeOtherDocument,
  removeDocument = require('../models/registrations').removeDocument,
  removeWhitepaper = require('../models/registrations').removeWhitepaper,
  UploadDocumentFactory = require('../models/uploadDocuments').creator,
  validate = require('../utils/signup-field-validation'),
  emailer = require('../utils/emailer'),
  stringHelper = require('../utils/stringHelpers'),
  strings = require('../config/strings'),
  httpStatus = require('http-status'),
  cfg = require('../config'),
  hbsHelper = require('../utils/hbsHelpersPDF'),
  fs = require('fs'),
  Handlebars = require('handlebars'),
  child_process = require("child_process"),
  logger = require('../utils/logger'),
  _ = require('lodash');


var _getFeedbackViewData = function (req, res, view) {
  registrationModel.findOne({'_id': req.params.id}, function (err, regDoc) {
    problemModel.findOne({'_id': regDoc.challengeID}, function (problemFindErr, problemDoc) {
      var renderObj = {title: 'Solution Feedback'};
      if (err) {
        logger.error(err);
        renderObj.isAlert = true;
        renderObj.message = 'An Error occurred while retrieving your Solution submission';
      }
      if (regDoc) {
        renderObj.registration = renderObj.isAlert && formData ? formData : regDoc;
      }
      if (problemDoc) {
        renderObj.challenge = problemDoc;
      }
      if (req.params.role) {
        renderObj.feedbackRole = req.params.role;
      }
      renderObj.feedbackDoc = null;
      renderObj.feedbackID = req.params.feedbackid;
      for (idx in regDoc.feedback) {
        if (idx) {
          var feedbackDoc = regDoc.feedback[idx];
          if (feedbackDoc.id === req.params.feedbackid) {
            renderObj.feedback = feedbackDoc;

            regDoc.feedback[idx].isRead = true;
            regDoc.save(function (saveError) {
              if (saveError) {
                logger.error(saveError);
              }
            });
            break;
          }
        }
      }

      res.render(view, renderObj);
    });
  });
};
var _getRegistrationViewData = function (req, res, template, updateErr, formData, message, isAlert) {
  registrationModel.findOne({_id: req.params.id}, function (err, regDoc) {
    capabilityModel.find({orgRef: regDoc.orgRef}, function (capabilityFindErr, capabilityDocs) {
      var renderObj = {title: 'Solution Submission'};
      if (!regDoc) {
        if (err || capabilityFindErr || updateErr) {
          logger.error(err || capabilityFindErr || updateErr);
          renderObj.isAlert = true;
          renderObj.message = 'An Error occurred while retrieving your Solution submission';
          if (updateErr) {
            renderObj.message = updateErr.message;
          }
        }
        res.render(template, renderObj);
      }

      if (message) {
        renderObj.message = message;
        renderObj.isAlert = isAlert;
      }

      renderObj.registration = renderObj.isAlert && formData ? formData : regDoc;
      if (capabilityDocs) {
        renderObj.products = capabilityDocs;
      }
      problemModel.findOne({_id: regDoc.challengeID}, function (problemFindErr, problemDoc) {
        renderObj.challenge = problemDoc;
        renderObj.customFields = [];
        if (req.params.role) {
          renderObj.feedbackRole = req.params.role;
        }

        for (var idx in problemDoc.customRegistrationFields) {
          if (!isNaN(idx)) {
            var customField = problemDoc.customRegistrationFields[idx];
            customField.field_value = "";
            for (var resIdx in regDoc.customFieldResponse) {
              if (!isNaN(resIdx)) {
                var response = regDoc.customFieldResponse[resIdx];
                if (customField._id.equals(response.fieldId)) {
                  customField.field_value = response.response;
                  break;
                }
              }
            }
            renderObj.customFields.push(customField);
          }
        }
        
        // Get the attachment paths
        renderObj.otherDocuments = [];
        for (var idxOtherDocuments = 0; idxOtherDocuments < regDoc.otherDocuments.length; idxOtherDocuments++) {
          if (typeof(regDoc.otherDocuments[idxOtherDocuments].path) != 'undefined' ||
              typeof(regDoc.otherDocuments[idxOtherDocuments].name) != 'undefined') {
            var tmpObj = {path: regDoc.otherDocuments[idxOtherDocuments].path,
                          name: regDoc.otherDocuments[idxOtherDocuments].name};
            renderObj.otherDocuments.push(tmpObj);
          }
        }
        res.render(template, renderObj);
      });
    });
  });
};

var _exportPDF = function (req, res) {
  registrationModel.findOne({_id: req.params.id}, function (err, regDoc) {
    capabilityModel.find({orgRef: regDoc.orgRef}, function (capabilityFindErr, capabilityDocs) {
      var renderObj = {title: 'Solution Submission'};

      renderObj.registration = renderObj.isAlert && formData ? formData : regDoc;
      if (capabilityDocs) {
        renderObj.products = capabilityDocs;
      }
      problemModel.findOne({_id: regDoc.challengeID}, function (problemFindErr, problemDoc) {
        organizationModel.findOne({_id: regDoc.orgRef}, function (orgErr, orgDoc) {
          renderObj.challenge = problemDoc;
          renderObj.customFields = [];
          if (req.params.role) {
            renderObj.feedbackRole = req.params.role;
          }

          for (var idx in problemDoc.customRegistrationFields) {
            if (!isNaN(idx)) {
              var customField = problemDoc.customRegistrationFields[idx];
              customField.field_value = "";
              for (var resIdx in regDoc.customFieldResponse) {
                if (!isNaN(resIdx)) {
                  var response = regDoc.customFieldResponse[resIdx];
                  if (customField._id.equals(response.fieldId)) {
                    customField.field_value = response.response;
                    break;
                  }
                }
              }
              renderObj.customFields.push(customField);

            }
          }

          // read the file and use the callback to render
          fs.readFile('views/registration/user-viewPDF.hbs', function (err, data) {
            if (!err) {
              // make the buffer into a string
              var source = data.toString();
              // call the render function
              var html = hbsHelper.renderToString(source, renderObj);
              
              var htmlPdf = require('html-pdf');
              var options = {
                format: 'Letter',
                phantomPath: "node_modules/phantomjs-prebuilt/lib/phantom/bin/phantomjs",
                orientation: "portrait"
              };
              htmlPdf.create(html, options).toFile('/tmp/'+regDoc._id+'.pdf', function(err, result) {
                if (err) {
                  logger.error(err);
                  res.json({error: "There was an error generating the document."});
                }
                else {
                  res.download('/tmp/' + regDoc._id + '.pdf', 'Registration_' + orgDoc.orgName + '_' + problemDoc.name + '.pdf', function (err) {
                    if (err) {
                      logger.error(err);
                      res.json({error: "There was an error generating the document."});
                    }
                    else {
                      fs.unlink('/tmp/' + regDoc._id + '.pdf', function (err) {
                        if (err) {
                          logger.error(err);
                          res.json({error: "There was an internal error. If you were unable to obtain the file export" +
                          "please try again at a later time."});
                        }
                      });
                    }
                  });
                }
              });

            } else {
              console.log('Read file error:' + err);
            }

          });
        });
      });
    });


  });
};
var _getByParamsID = function (req, callback) {
  registrationModel.findOne({_id: req.params.id}, callback);
};

registrationController = {users: {}, admin: {}};

registrationController.helpers = {
  processCustomFields: function (reqBody) {
    var customResponses = [];
    for (var fieldKey in reqBody) {
      if (fieldKey.indexOf && fieldKey.indexOf('custom') === 0) {
        var fieldInfo = fieldKey.split('-');
        if (fieldInfo.length === 3) {
          var value = reqBody[fieldKey];
          customResponses.push({
            fieldId: fieldInfo[2],
            response: value,
            fieldType: fieldInfo[1]
          });
        }
      }
    }
    return customResponses;
  },
  processFeedbackFields: function (reqBody) {
    var feedbackFields = [];
    for (var fieldKey in reqBody) {
      if (fieldKey.indexOf && fieldKey.indexOf('feedbackArea') === 0) {
        var fieldInfo = fieldKey.split('-');
        if (fieldInfo.length === 2) {
          var value = reqBody[fieldKey];
          feedbackFields.push({
            feedbackRef: fieldInfo[1],
            response: value
          });
        }
      }
    }
    return feedbackFields;
  },
  processWhitepaperUploads: function (reqFiles) {
    var newWhitepaper = null;
    if (reqFiles.whitepaper) {
      var newWhitepaperDoc = UploadDocumentFactory(reqFiles.whitepaper.originalname,
        reqFiles.whitepaper.mimetype,
        cfg.privateSolutionSubmissionFilesURL + '/' + reqFiles.whitepaper.name);
      newWhitepaper = newWhitepaperDoc.toObject();
    }
    return newWhitepaper;
  },
  processOtherDocumentationUploads: function (reqFiles) {
    var newOtherDocuments = [];
    if (reqFiles.otherDocumentation) {
      var otherDocuments = reqFiles.otherDocumentation;
      if (otherDocuments.constructor === Array) {
        for (var i = 0; i < otherDocuments.length; i++) {
          var newDocObj = UploadDocumentFactory(
            otherDocuments[i].originalname,
            otherDocuments[i].mimetype,
            cfg.privateSolutionSubmissionFilesURL + '/' + otherDocuments[i].name
          );
          newOtherDocuments.push(newDocObj);
        }
      }
      else if (typeof otherDocuments === 'object') {
        var newDocObj = UploadDocumentFactory(
          otherDocuments.originalname,
          otherDocuments.mimetype,
          cfg.privateSolutionSubmissionFilesURL + '/' + otherDocuments.name
        );
        newOtherDocuments.push(newDocObj);
      }
    }
    return newOtherDocuments;
  }
};

registrationController.user = {};

registrationController.user.search = {
  get: function (req, res) {
    var searchQuery = new RegExp(req.params.query, 'i');
    // Search based on either the organization name or
    // keywords within the custom fields
    var mongoQuery = [
      // Join the organization data for those that submitted the solutions
      {
        $lookup: {
          "from": "organizations",
          "localField": "orgRef",
          "foreignField": "_id",
          "as": "organization" 
        }
      },
      {
        $unwind: "$organization"
      },
      // Search based on organization name and words within the custom field responses
      {
        $match: { $or: [{"organization.orgName": searchQuery}, {customFieldResponse: {$elemMatch: {response: searchQuery}}}] }
      }
    ];
    var responseJson = [];
    registrationModel.aggregate(mongoQuery, function(findErr, solutionDocs) {
      if(findErr) {
        logger.error(findErr);
        res.json({error: "There was an error while querying the solution submissions."});
      }
      else {
        // LH: Because the ids for the problems/challenges reference was not saved as an ObjectId in the solutions/registration
        // collection an aggregate lookup won't work because the data types don't match (at least I can't get the lookup to work)
        // As a result all of the problems are returned and the required custom field name is searched for within the array 
        problemModel.find({}, function (findProblemErr, problemDocs){
          if (findProblemErr) {
            logger.error(findProblemErr);
            res.json({error: "There was an error while querying the problems."});
          }
          else if (problemDocs.length < 1) {
            res.json({message: "No problems were found."});
          }
          else {
            // Loop through the solution submissions returned so the response object can be formulated
            solutionDocs.forEach(function (val, idx) {
              // Find the first custom field response section that contains the search criteria
              var customField = _.find(val.customFieldResponse, function (obj, idxCustomField) {
                if (searchQuery.test(obj.response)) {
                  // Add the custom field name here
                  for (var idxProblem = 0; idxProblem < problemDocs.length; idxProblem++) {
                    var valProblem = problemDocs[idxProblem];
                    if (valProblem._id.toString() == val.challengeID) {
                      // Add the problem name
                      val.problemName = valProblem.name;
                      // Add the custom field label
                      if (valProblem.customRegistrationFields[idxCustomField]) {
                        obj.fieldName = valProblem.customRegistrationFields[idxCustomField].label;
                      }
                      // Only finding the first, so fine to break
                      break;
                    }
                  };
                  return obj.response;
                }
              });
              // If the search term was not in a custom field it was in the organization name so get the problem
              // name for that case here
              if (!customField) {
                customField = {};
                for (var idxProblem = 0; idxProblem < problemDocs.length; idxProblem++) {
                  var valProblem = problemDocs[idxProblem];
                  if (valProblem._id.toString() == val.challengeID) {
                    // Add the problem name
                    val.problemName = valProblem.name;
                    customField.fieldName = "Keyword";
                    customField.response = "No results";
                    // Only finding the first, so fine to break
                    break;
                  }
                };
              }
              // If for some reason the problem for which the queried solution was submitted no longer exists, move on
              if (!val.problemName) {
                return;
              }
              // Get the organization name and logo path for the organization that submitted the solution
              var organizationName = val.organization[0] ? val.organization[0].orgName : val.organization.orgName;
              var organizationLogoUrl = val.organization[0] ? val.organization[0].logoUrl : val.organization.logoUrl;
              if (!organizationLogoUrl) {
                organizationLogoUrl = strings.PublicStaticContentDirectoryFullPrefixPath + '/images/logo-default.png';
              }

              // Only capture and return a subset of the custom field response
              var numCharacterToReturn = 150;
              var match = searchQuery.exec(customField.response);
              if (match != null) {
                var startIdx = match.index - Math.floor(numCharacterToReturn/2) < 0 ? 0 : match.index - Math.floor(numCharacterToReturn/2);
                customField.response = customField.response.substr(startIdx, numCharacterToReturn);
                if (match.index > 1) {
                  customField.response = '...' + customField.response;
                }
                if (customField.response.length > numCharacterToReturn) {
                  customField.response += '...';
                }
              }
              customField.fieldName = customField.fieldName.substr(0, numCharacterToReturn);
              if (customField.fieldName.length > numCharacterToReturn) {
                customField.fieldName += '...';
              }

              responseJson.push({
                "organizationName": organizationName,
                "organizationLogoUrl": organizationLogoUrl,
                "problemName": val.problemName,
                "problemId": val.challengeID,
                "solutionId": val._id.toString(),
                "dateSubmitted": (val.date_created.getMonth()+1) + "/" + val.date_created.getDate() + "/" + val.date_created.getFullYear(),
                "customField": customField
              });
            });
            // Flip the results array so newer solutions show up first
            responseJson.reverse();
            res.json(responseJson);
          }
        });
      }
    });
  }
};

registrationController.user.view = {
  get: function (req, res) {
    _getRegistrationViewData(req, res, 'registration/user-view');
  }
};

registrationController.user.viewFeedback = {};
registrationController.user.exportPDF = {};
registrationController.user.viewFeedback.get = function (req, res) {
  _getRegistrationViewData(req, res, 'registration/user-feedbackTable');
};
registrationController.user.exportPDF.get = function (req, res) {
  _exportPDF(req, res);
};

registrationController.user.update = {
  get: function (req, res) {
    _getRegistrationViewData(req, res, 'registration/user-update');
  },
  post: function (req, res) {
    var regFields = {};
    regFields.productID = req.body.capabilityId || "";
    regFields.orgRef = req.user.orgRef || "";
    regFields.pocName = req.body.pocName || "";
    regFields.pocEmail = req.body.pocEmail || "";
    regFields.description = req.body.description || "";
    regFields.accessInstructions = req.body.accessInstructions || "";
    regFields.customFieldResponse = registrationController.helpers.processCustomFields(req.body);
    if (req.files) {
      if (req.files.whitepaper) {
        regFields.whitepaper = registrationController.helpers.processWhitepaperUploads(req.files);
      }
      if (req.files.otherDocumentation) {
        regFields.otherDocuments = registrationController.helpers.processOtherDocumentationUploads(req.files);
      }
    }
    registrationUpdater(req.params.id, regFields, function (err, obj) {
        var message = 'Your changes have been saved.';
        var isAlert = false;
        if (err) {
          message = err.message ? err.message : 'Cannot process your request at this time';
          isAlert = true;
          logger.error(err);
        }
        _getRegistrationViewData(req, res, 'registration/user-update', err, obj, message, isAlert);
      }
    );
  }
};

registrationController.user.delete = {};
registrationController.user.delete.get = function (req, res) {
  registrationModel.findOne({_id: req.params.id}, function (err, regDoc) {
    var renderObj = {title: 'Solution Deletion'};
    if (err) {
      logger.error(err);
      res.render('registration/user-delete', renderObj);
    }
    else {
      renderObj.registration = regDoc;
      res.render('registration/user-delete', renderObj);
    }
  });
};
registrationController.user.delete.post = function (req, res) {
  registrationModel.findOne({_id: req.params.id}, function (err, regDoc) {
    var renderObj = {title: 'Solution Deletion'};
    if (err) {
      logger.error(err);
      res.render('registration/user-delete', renderObj);
    }
    else {
      regDoc.remove(function (removeErr) {
        var msg = 'Successfully Deleted';
        var isAlert = false;
        if (removeErr) {
          logger.error(removeErr);
          msg = 'Could not delete your solution at this time';
          isAlert = true;
        }
        renderObj.message = msg;
        renderObj.isAlert = isAlert;
        res.render('registration/user-delete', renderObj);
      });
    }
  });
};
registrationController.user.deleteReg = {};
registrationController.user.deleteReg.post = function (req, res) {
    registrationModel.findOne({ _id: req.params.id }, function (err, regDoc) {
        var renderObj = { title: 'Solution Deletion' };
        if (err) {
            logger.error(err);
            res.render('registration/user-delete', renderObj);
        }
        else {
            regDoc.remove(function (removeErr) {
                var msg = 'Successfully Deleted';
                var isAlert = false;
                if (removeErr) {
                    logger.error(removeErr);
                    msg = 'Could not delete your solution at this time';
                    isAlert = true;
                }
                renderObj.message = msg;
                renderObj.isAlert = isAlert;
                res.send(renderObj);
            });
        }
    });
};

registrationController.user.removeDoc = {};
registrationController.user.removeDoc.post = function (req, res) {
  //TODO : Add swagger make API call
  try {
    if (req.params.id, req.body.docName) {
      removeDocument(req.params.id, req.body.docName, function (err) {
        if (err) {
          res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: err.message});
        } else {
          res.status(httpStatus.OK).json({message: 'Document Removed'});
        }
      });
    }
    else {
    }
  }
  catch (err) {
    logger.error(err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({message: 'Cannot process your request at this time.'})
      .end();
  }
};

registrationController.user.removeWhitePaper = {};
registrationController.user.removeWhitePaper.post = function (req, res) {
  //TODO : Add swagger make API call
  try {
    if (req.params.id) {
      removeWhitepaper(req.params.id, function (err) {
        if (err) {
          res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: err.message});
        } else {
          res.status(httpStatus.OK).json({message: 'Whitepaper Removed'});
        }
      });
    }
    else {
      res.status(httpStatus.BAD_REQUEST)
    }
  }
  catch (err) {
    logger.error(err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({message: 'Cannot process your request at this time.'})
      .end();
  }
};

registrationController.user.feedback = {};
registrationController.user.feedback.create = {};
registrationController.user.feedback.create.get = function (req, res) {
  registrationModel.findOne({'_id': req.params.id}, function (err, regDoc) {
    problemModel.findOne({'_id': regDoc.challengeID}, function (err, problemDoc) {
      organizationModel.findOne({'_id': regDoc.orgRef}, function (findOrgErr, orgDoc) {
        if (err) {
          logger.error(err);
        }
        res.render('registration/user-leaveFeedback', {
          title: 'Leave Feedback',
          registration: regDoc,
          challenge: problemDoc,
          organization: orgDoc
        });
      });
    });
  });
};

registrationController.user.feedback.create.post = function (req, res) {
  registrationModel.findOne({'_id': req.params.id}, function (findErr, regDoc) {
    if (findErr) {
      logger.error(findErr);
      res.json({error: "There was an error making the request."});
    }
    else {
      problemModel.findOne({'_id': regDoc.challengeID}, function(problemFindErr, problemDocument) {
        if (problemFindErr) {
          logger.error(problemFindErr);
          res.json({error: "There was an error making the request."});
        }
        else {
          // The following code finds the poc email in the custom registration responses
          // NOTE: LH: While the poc name/email is shown in the registration schema, it doesn't appear to be used anymore.
          //       Instead the poc name/email fields are populated by default in the custom fields area. These can be
          //       deleted, however. I'm not sure why this change was made...
          var pocEmail = "";
          // Find the field with the POC email (though the user can delete this)
          var idxPocEmailField =
            problemDocument.customRegistrationFields.map(function (e) {
              return e.label;
            }).indexOf('POC Email');

          if (idxPocEmailField > -1) {
            // Get the email address in the POC Email field
            var idxPocEmail =
              regDoc.customFieldResponse.map(function (e) {
                return e.fieldId.toString()
              }).indexOf(
                problemDocument.customRegistrationFields[idxPocEmailField]._id.toString()
              );
            pocEmail = regDoc.customFieldResponse[idxPocEmail].response;
          }
          else {
            // Use organization POC email perhaps for the organization that submitted the solution?
          }
          
          var isDraft = false;
          if (req.body.operation === 'Save Draft') {
            isDraft = true;
          }
          var feedbackFields = {};
          feedbackFields = registrationController.helpers.processFeedbackFields(req.body);

          feedbackFactory(regDoc, isDraft, false, req.body.summary, req.files.feedbackDoc, req.files.otherDocuments, feedbackFields, function (feedbackErr, feedbackDoc) {
            var renderObj = {title: '', formData: null};
            if (feedbackErr) {
              logger.error(feedbackErr);
              renderObj.formData = feedbackDoc;
              renderObj.message = feedbackErr.message || 'Cannot process your request at this time';
              renderObj.isAlert = true;
              res.render('registration/user-leaveFeedback', renderObj);
            }
            else {

              var userDisplayName = req.user.username;
              if (req.user.firstName && req.user.lastName) {
                userDisplayName = req.user.firstName + ' ' + req.user.lastName;
              }

              stringHelper.format(strings.Emails.feedbackEmail.html, userDisplayName, regDoc.challengeName);
              var newEmailObj = cfg.newUserEmailObj;
              newEmailObj.to = regDoc.pocEmail;
              newEmailObj.text = 'Dear ' + userDisplayName + ':\n Feedback has been given on your solution for problem ' + regDoc.challengeName;
              newEmailObj.html = 'Dear ' + userDisplayName + ':<br/> Feedback has been given on your solution for problem ' + regDoc.challengeName;

              // The bcc isn't working, so send the email to each party
              emailer.sendEmail({
                from: cfg.helpDeskEmail,
                to: pocEmail,
                //bcc: cfg.feedbackBccEmail,
                subject: strings.Emails.feedbackEmail.subject,
                text: stringHelper.format(strings.Emails.feedbackEmail.text, userDisplayName, regDoc.challengeName),
                html: stringHelper.format(strings.Emails.feedbackEmail.html, userDisplayName, regDoc.challengeName)
              });

              emailer.sendEmail({
                from: cfg.helpDeskEmail,
                to: cfg.feedbackBccEmail,
                subject: strings.Emails.feedbackEmail.subject,
                text: stringHelper.format(strings.Emails.feedbackEmail.text, userDisplayName, regDoc.challengeName),
                html: stringHelper.format(strings.Emails.feedbackEmail.html, userDisplayName, regDoc.challengeName)
              });

              organizationModel.findOne({'_id': regDoc.orgRef}, function (findOrgErr, orgDoc) {
                if (!isDraft) {
                  var successObj = {
                    modalMessage: strings.Solutions.Feedback.Success,
                    username: req.user.username,
                    challengeID: regDoc.challengeID,
                    organization: orgDoc
                  };
                  res.render('registration/user-leaveFeedback', successObj);
                }
                else {
                  problemModel.findOne({'_id': regDoc.challengeID}, function (err, problemDoc) {
                    var message = 'Feedback saved successfully.';
                    var isAlert = false;
                    if (err) {
                      logger.error(err);
                      message = 'Feedback failed to save.';
                      isAlert = true;
                    }
                    res.render('registration/user-resumeFeedback', {
                      title: 'Continue Provider Feedback',
                      message: message,
                      isAlert: isAlert,
                      registration: regDoc,
                      challenge: problemDoc,
                      organization: orgDoc
                    });
                  });
                }
              });
            }
          });
        }
      });
    }
  });
};

registrationController.user.feedback.view = {};
registrationController.user.feedback.view.get = function (req, res) {
  _getFeedbackViewData(req, res, 'registration/user-readFeedback');
};

registrationController.user.feedback.update = {};
registrationController.user.feedback.update.get = function (req, res) {
  registrationModel.findOne({'_id': req.params.id}, function (err, regDoc) {
    problemModel.findOne({'_id': regDoc.challengeID}, function (err, problemDoc) {
      organizationModel.findOne({'_id': regDoc.orgRef}, function (findOrgErr, orgDoc) {
        if (err) {
          logger.error(err);
        }
        res.render('registration/user-resumeFeedback', {
          title: 'Leave Feedback',
          registration: regDoc,
          challenge: problemDoc,
          organization: orgDoc
        });
      });
    });
  });
};

registrationController.user.feedback.update.post = function (req, res) {
  registrationModel.findOne({'_id': req.params.id}, function (findErr, regDoc) {
    problemModel.findOne({'_id': regDoc.challengeID}, function (findErr, problemDoc) {
      if (findErr) {
        logger.error(findErr);
      }
      var parameters = {};
      if (req.body.operation === 'Save Draft') {
        parameters.isDraft = true;
      } else {
        parameters.isDraft = false;
      }

      var feedbackAreas = {};
      feedbackAreas = registrationController.helpers.processFeedbackFields(req.body);
      var isodate = new Date().toISOString()

      parameters.feedbackAreas = feedbackAreas;
      parameters.summary = req.body.summary;
      parameters.feedbackDoc = req.files.feedbackDoc;
      parameters.otherDocuments = req.files.otherDocuments;
      parameters.date_created = isodate;
      feedbackUpdate(regDoc, problemDoc, parameters, function (err, regDoc) {
        if (parameters.isDraft) {
          var successObj = {registration: regDoc, challenge: problemDoc};
          res.render('registration/user-resumeFeedback', successObj);
        }
        else {
          var successObj = {
            modalMessage: strings.Solutions.Feedback.Success,
            username: req.user.username,
            challengeID: regDoc.challengeID
          };
          
          var pocEmail = "";
          // Find the field with the POC email (though the user can delete this)
          var idxPocEmailField =
            problemDoc.customRegistrationFields.map(function (e) {
              return e.label;
            }).indexOf('POC Email');

          if (idxPocEmailField > -1) {
            // Get the email address in the POC Email field
            var idxPocEmail =
              regDoc.customFieldResponse.map(function (e) {
                return e.fieldId.toString()
              }).indexOf(
                problemDoc.customRegistrationFields[idxPocEmailField]._id.toString()
              );
            pocEmail = regDoc.customFieldResponse[idxPocEmail].response;
          }
          else {
            // Use organization POC email perhaps for the organization that submitted the solution?
          }
          
          var userDisplayName = req.user.username;
          if (req.user.firstName && req.user.lastName) {
            userDisplayName = req.user.firstName + ' ' + req.user.lastName;
          }

          stringHelper.format(strings.Emails.feedbackEmail.html, userDisplayName, regDoc.challengeName);
          var newEmailObj = cfg.newUserEmailObj;
          newEmailObj.to = regDoc.pocEmail;
          newEmailObj.text = 'Dear ' + userDisplayName + ':\n Feedback has been given on your solution for problem ' + regDoc.challengeName;
          newEmailObj.html = 'Dear ' + userDisplayName + ':<br/> Feedback has been given on your solution for problem ' + regDoc.challengeName;

          // The bcc isn't working, so send the email to each party
          emailer.sendEmail({
            from: cfg.helpDeskEmail,
            to: pocEmail,
            //bcc: cfg.feedbackBccEmail,
            subject: strings.Emails.feedbackEmail.subject,
            text: stringHelper.format(strings.Emails.feedbackEmail.text, userDisplayName, regDoc.challengeName),
            html: stringHelper.format(strings.Emails.feedbackEmail.html, userDisplayName, regDoc.challengeName)
          });

          emailer.sendEmail({
            from: cfg.helpDeskEmail,
            to: cfg.feedbackBccEmail,
            subject: strings.Emails.feedbackEmail.subject,
            text: stringHelper.format(strings.Emails.feedbackEmail.text, userDisplayName, regDoc.challengeName),
            html: stringHelper.format(strings.Emails.feedbackEmail.html, userDisplayName, regDoc.challengeName)
          });
          res.render('registration/user-leaveFeedback', successObj);
        }
      });
    });
  });
};

registrationController.user.feedback.deletefeedbackdocument = {};
registrationController.user.feedback.deletefeedbackdocument.post = function (req, res) {
  registrationModel.findOne({'_id': req.params.id}, function (err, regDoc) {
    if (err) {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json('Server error. Please try again at a later time.');
    }
    else if (!regDoc) {
      res.status(httpStatus.OK).json('There is no document with the given ID.');
    }
    else {
      feedbackRemoveFeedbackDocument(regDoc, req.params.feedbackid, req.params.feedbackdocumentname, function (msg) {
        res.status(httpStatus.OK).json(msg);
      });
    }
  });
};

registrationController.user.feedback.deleteotherdocument = {};
registrationController.user.feedback.deleteotherdocument.post = function (req, res) {
  registrationModel.findOne({'_id': req.params.id}, function (err, regDoc) {
    if (err) {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json('Server error. Please try again at a later time.');
    }
    else if (!regDoc) {
      res.status(httpStatus.OK).json('There is no document with the given ID.');
    }
    else {
      feedbackRemoveOtherDocument(regDoc, req.params.feedbackid, req.params.otherdocumentname, function (msg) {
        res.status(httpStatus.OK).json(msg);
      });
    }
  });
};

registrationController.user.feedback.submitproviderfeedback = {
  post: function (req, res){
    registrationModel.findOne({'_id': req.params.registrationid}, function (err, regDoc) {
      if (err) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'Server error. Please try again at a later time.'});
      }
      else if (!regDoc) {
        res.status(httpStatus.OK).json({message: 'There is no solution with the given ID.'});
      }
      else {
        for (var idx in regDoc.feedback) {
          if (regDoc.feedback[idx].id == req.params.feedbackid) {
            regDoc.feedback[idx].isDraft = false;
            regDoc.feedback[idx].date_submitted = new Date().getTime();
            regDoc.save(function(saveErr){
              if (saveErr) {
                logger.error(saveErr);
                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'Error: Feedback was not submitted to the provider. Please try again at a later time.', isAlert: true});
              }
              else {
                problemModel.findOne({'_id': regDoc.challengeID}, function (problemFindErr, problemDocument) {
                  if (problemFindErr) {
                    logger.error(problemFindErr);
                    res.json({error: "There was an error making the request."});
                  }
                  else {
                    // The following code finds the poc email in the custom registration responses
                    // NOTE: LH: While the poc name/email is shown in the registration schema, it doesn't appear to be used anymore.
                    //       Instead the poc name/email fields are populated by default in the custom fields area. These can be
                    //       deleted, however. I'm not sure why this change was made...
                    var pocEmail = "";
                    // Find the field with the POC email (though the user can delete this)
                    var idxPocEmailField =
                      problemDocument.customRegistrationFields.map(function (e) {
                        return e.label;
                      }).indexOf('POC Email');

                    if (idxPocEmailField > -1) {
                      // Get the email address in the POC Email field
                      var idxPocEmail =
                        regDoc.customFieldResponse.map(function (e) {
                          return e.fieldId.toString()
                        }).indexOf(
                          problemDocument.customRegistrationFields[idxPocEmailField]._id.toString()
                        );
                      pocEmail = regDoc.customFieldResponse[idxPocEmail].response;
                    }
                    else {
                      // Use organization POC email perhaps for the organization that submitted the solution?
                    }
                  }
                  
                  var userDisplayName = req.user.username;
                  if (req.user.firstName && req.user.lastName) {
                    userDisplayName = req.user.firstName + ' ' + req.user.lastName;
                  }

                  stringHelper.format(strings.Emails.feedbackEmail.html, userDisplayName, regDoc.challengeName);
                  var newEmailObj = cfg.newUserEmailObj;
                  newEmailObj.to = regDoc.pocEmail;
                  newEmailObj.text = 'Dear ' + userDisplayName + ':\n Feedback has been given on your solution for problem ' + regDoc.challengeName;
                  newEmailObj.html = 'Dear ' + userDisplayName + ':<br/> Feedback has been given on your solution for problem ' + regDoc.challengeName;

                  // The bcc isn't working, so send the email to each party
                  emailer.sendEmail({
                    from: cfg.helpDeskEmail,
                    to: pocEmail,
                    //bcc: cfg.feedbackBccEmail,
                    subject: strings.Emails.feedbackEmail.subject,
                    text: stringHelper.format(strings.Emails.feedbackEmail.text, userDisplayName, regDoc.challengeName),
                    html: stringHelper.format(strings.Emails.feedbackEmail.html, userDisplayName, regDoc.challengeName)
                  });
                  
                  emailer.sendEmail({
                    from: cfg.helpDeskEmail,
                    to: cfg.feedbackBccEmail,
                    subject: strings.Emails.feedbackEmail.subject,
                    text: stringHelper.format(strings.Emails.feedbackEmail.text, userDisplayName, regDoc.challengeName),
                    html: stringHelper.format(strings.Emails.feedbackEmail.html, userDisplayName, regDoc.challengeName)
                  });
                  
                  res.status(httpStatus.OK).json({message: 'Solution submitted successfully.'});
                });
              }
            });
          }
        }
      }
    });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Internal Assessment Methods
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

registrationController.user.createInternalAssessment = {
  get: function (req, res) {
    registrationModel.findOne({'_id': req.params.id}, function (registrationErr, registrationDoc) {
      if (registrationErr) {
        logger.error(registrationErr);
        // TODO Finish error handling
      }
      capabilityModel.findOne({_id: registrationDoc.productID}, function (capabilityFindErr, capabilityDoc) {
        if (capabilityFindErr) {
          logger.error(capabilityFindErr);
          // TODO Finish error handling
        }
        problemModel.findOne({'_id': registrationDoc.challengeID}, function (problemFindErr, problemDoc) {
          if (problemFindErr) {
            logger.error(problemFindErr);
            // TODO Finish error handling
          }
          organizationModel.findOne({'_id': registrationDoc.orgRef}, function (organizationErr, organizationDoc) {
            if (organizationErr) {
              logger.error(organizationErr);
              renderObj.isAlert = true;
              renderObj.message = 'An Error occurred while retrieving the Solution submission';
            }

            var renderObj = {
              title: 'Solution Internal Assessment',
              registration: registrationDoc,
              product: capabilityDoc,
              challenge: problemDoc,
              organization: organizationDoc
            };
            res.render('registration/user-createInternalAssessment', renderObj);
          })
        });
      });
    });
  },

  post: function(req, res) {
    // Create the new assessment
    internalAssessmentModule.creator(req.params.id, req.body.overview, req.body.ratingRadioBtn, req.files.attachments, res.locals);

    // Redirect to the registration listings page
    registrationModel.findOne({'_id': req.params.id}, function (registrationErr, registrationDoc) {
      if (registrationErr) {
        logger.error(registrationErr);
        // TODO Finish error handling
      }
      problemModel.findOne({'_id': registrationDoc.challengeID}, function (problemFindErr, problemDoc) {
        if (problemFindErr) {
          logger.error(problemFindErr);
          // TODO Finish error handling
        }
        res.redirect('/profile/'+res.locals.userinfo.username.toString()+'/manage/problems/'+problemDoc.id.toString()+'/view');
      });
    });
  }
};

registrationController.user.readInternalAssessment = {
  get: function (req, res) {
    // Read the assessment
    internalAssessmentModule.read(req.params.id, req.params.internalassessmentid, function(renderObj) {
      res.render('registration/user-readInternalAssessment', renderObj);
    });
  }
};

registrationController.user.updateInternalAssessment = {
  get: function (req, res) {
    internalAssessmentModule.read(req.params.id, req.params.internalassessmentid, function(renderObj) {
      res.render('registration/user-updateInternalAssessment', renderObj);
    });
  },

  post: function(req, res) {
    // Update the assessment
    internalAssessmentModule.update(req.params.id, req.params.internalassessmentid, req.body.overview, req.body.ratingRadioBtn, req.files.attachments, res.locals);

    // Redirect to the registration listings page
    registrationModel.findOne({'_id': req.params.id}, function (registrationErr, registrationDoc) {
      if (registrationErr) {
        logger.error(registrationErr);
        // TODO Finish error handling
      }
      problemModel.findOne({'_id': registrationDoc.challengeID}, function (problemFindErr, problemDoc) {
        if (problemFindErr) {
          logger.error(problemFindErr);
          // TODO Finish error handling
        }
        res.redirect('/profile/'+res.locals.userinfo.username.toString()+'/manage/problems/'+problemDoc.id.toString()+'/view');
      });
    });
  },

  deleteAttachment: function (req, res) {
    // This query will find the registration document that has an internal assessment with the given id.
    // However, the registration document returned will ONLY contain the internal assessment matching the given id as a
    // single element array.
    registrationModel.findOne({'_id': req.params.id, 'internalAssessments._id': req.params.internalassessmentid}, {'internalAssessments.$': 1}, function(regFindErr, registrationDoc){
      // Find the attachment based on the uid and remove it from the array of attachments
      internalAssessmentModule.deleteAttachment(registrationDoc, registrationDoc.internalAssessments[0], req.params.attachmentuid, function (msg, attachments) {
        if (msg.isAlert) {
          res.status(httpStatus.OK).json(msg);
        }
        else {
          // Update the internal assessment within the registration with the attachment reference removed from the array
          registrationModel.findOneAndUpdate({'_id': req.params.id,
                                              'internalAssessments._id': req.params.internalassessmentid
                                              }, {'internalAssessments.$.attachments': attachments},
                                              function (regFindErr2) {
            if (regFindErr2) {
              var msg = {message: 'Failed to update internal assessment. Please try again later.'};
            }
            else {
              var msg = {message: 'File deleted successfully.'};
            }
            res.status(httpStatus.OK).json(msg);
          });
        }
      });
    });
  }
};

registrationController.user.deleteInternalAssessment = {
  delete: function (req, res) {
    internalAssessmentModule.deletor(req.params.id, req.params.internalassessmentid, function (status, msgObj) {
      res.status(httpStatus.OK).json(msgObj);
    });
  }
};

registrationController.document = {
  get: function (req, res) {
    docHlpr.getDataFromS3(req, res, cfg.privateSolutionSubmissionFilesURL);
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

registrationController.admin.list = {
  get: function (req, res) {
    registrationModel.find({}, function (err, regDocs) {
      problemModel.find({}, function (problemFindErr, problemDocs) {
        organizationModel.find({}, function (orgErr, orgDocs) {
          if (err || orgErr || problemFindErr) {
            if (problemFindErr) {
              err = problemFindErr;
            }
            if (orgErr) {
              err = orgErr;
            }
            res.render('error', {
              error: error,
              title: 'Solution Administration'
            })
          }
          else {
            res.render('registration/admin-list', {
              title: 'Solution Administration',
              registrations: regDocs,
              challenges: problemDocs,
              organizations: orgDocs
            });
          }
        });
      });
    });
  }
};
registrationController.admin.view = {
  get: function (req, res) {
    _getRegistrationViewData(req, res, 'registration/admin-view');
  }
};
registrationController.admin.update = {
  get: function (req, res) {
    _getRegistrationViewData(req, res, 'registration/admin-update');
  },
  post: function (req, res) {
    var regFields = {};
    regFields.productID = req.body.capabilityId || "";
    regFields.orgRef = req.user.orgRef || "";
    regFields.pocName = req.body.pocName || "";
    regFields.pocEmail = req.body.pocEmail || "";
    regFields.description = req.body.description || "";
    regFields.accessInstructions = req.body.accessInstructions || "";
    regFields.customFieldResponse = registrationController.helpers.processCustomFields(req.body);
    if (req.files) {
      if (req.files.whitepaper) {
        regFields.whitepaper = registrationController.helpers.processWhitepaperUploads(req.files);
      }
      if (req.files.otherDocumentation) {
        regFields.otherDocuments = registrationController.helpers.processOtherDocumentationUploads(req.files);
      }
    }
    registrationUpdater(req.params.id, regFields, function (err, obj) {
        var message = 'Your changes have been saved.';
        var isAlert = false;
        if (err) {
          message = err.message ? err.message : 'Cannot process your request at this time';
          isAlert = true;
          logger.error(err);
        }
        _getRegistrationViewData(req, res, 'registration/admin-update', err, obj, message, isAlert);
      }
    );
  }
};
registrationController.admin.delete = {
  post: function (req, res) {
    registrationModel.findOne({_id: req.body.id}, function (err, regDoc) {
      if (err) {
        logger.error(err);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'Could not delete your solution at this time'});
      }
      else {
        regDoc.remove(function (removeErr) {
          if (removeErr) {
            logger.error(removeErr);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'Could not delete your solution at this time'});
          }
          else {
            res.status(httpStatus.ACCEPTED).json({message: 'Success'});
          }
        });
      }
    });
  }
};

registrationController.admin.exportPDF = {
  get: function (req, res) {
    _exportPDF(req, res);
  }
};

registrationController.admin.document = {
  get: function (req, res) {
    docHlpr.getDataFromS3(req, res, '/docs');
  }
};

registrationController.admin.feedback = {
  list: {
    get: function(req, res){
      _getRegistrationViewData(req, res, 'registration/admin-feedbackTable');
    }
  },
  view: {
    get: function (req, res) {
      _getFeedbackViewData(req, res, 'registration/admin-readFeedback');
    }
  },
  create: {
    get: function (req, res) {
      _getFeedbackViewData(req, res, 'registration/admin-leaveFeedback');
    },
    post: function (req, res) {
      _getByParamsID(req, function (findErr, regDoc) {
        if (findErr) {
          logger.error(findErr);
          res.json({error: "There was an error making the request."});
        }
        else {
          problemModel.findOne({'_id': regDoc.challengeID}, function(problemFindErr, problemDocument) {
            if (problemFindErr) {
              logger.error(problemFindErr);
              res.json({error: "There was an error making the request."});
            }
            else {
              // The following code finds the poc email in the custom registration responses
              // NOTE: LH: While the poc name/email is shown in the registration schema, it doesn't appear to be used anymore.
              //       Instead the poc name/email fields are populated by default in the custom fields area. These can be
              //       deleted, however. I'm not sure why this change was made...
              var pocEmail = "";
              // Find the field with the POC email (though the user can delete this)
              var idxPocEmailField =
                problemDocument.customRegistrationFields.map(function (e) {
                  return e.label;
                }).indexOf('POC Email');

              if (idxPocEmailField > -1) {
                // Get the email address in the POC Email field
                var idxPocEmail =
                  regDoc.customFieldResponse.map(function (e) {
                    return e.fieldId.toString()
                  }).indexOf(
                    problemDocument.customRegistrationFields[idxPocEmailField]._id.toString()
                  );
                pocEmail = regDoc.customFieldResponse[idxPocEmail].response;
              }
              else {
                // Use organization POC email perhaps for the organization that submitted the solution?
              }
              
              var isDraft = false;
              if (req.body.operation === 'Save Draft') {
                isDraft = true;
              }
              var feedbackFields = {};
              feedbackFields = registrationController.helpers.processFeedbackFields(req.body);

              feedbackFactory(regDoc, isDraft, false, req.body.summary, req.files.feedbackDoc, req.files.otherDocuments, feedbackFields, function (feedbackErr, feedbackDoc) {
                var renderObj = {title: '', formData: null};
                if (feedbackErr) {
                  logger.error(feedbackErr);
                  renderObj.formData = feedbackDoc;
                  renderObj.message = feedbackErr.message || 'Cannot process your request at this time';
                  renderObj.isAlert = true;
                  res.render('registration/user-leaveFeedback', renderObj);
                }
                else {

                  var userDisplayName = req.user.username;
                  if (req.user.firstName && req.user.lastName) {
                    userDisplayName = req.user.firstName + ' ' + req.user.lastName;
                  }

                  stringHelper.format(strings.Emails.feedbackEmail.html, userDisplayName, regDoc.challengeName);
                  var newEmailObj = cfg.newUserEmailObj;
                  newEmailObj.to = regDoc.pocEmail;
                  newEmailObj.text = 'Dear ' + userDisplayName + ':\n Feedback has been given on your solution for problem ' + regDoc.challengeName;
                  newEmailObj.html = 'Dear ' + userDisplayName + ':<br/> Feedback has been given on your solution for problem ' + regDoc.challengeName;

                  // The bcc isn't working, so send the email to each party
                  emailer.sendEmail({
                    from: cfg.helpDeskEmail,
                    to: pocEmail,
                    //bcc: cfg.feedbackBccEmail,
                    subject: strings.Emails.feedbackEmail.subject,
                    text: stringHelper.format(strings.Emails.feedbackEmail.text, userDisplayName, regDoc.challengeName),
                    html: stringHelper.format(strings.Emails.feedbackEmail.html, userDisplayName, regDoc.challengeName)
                  });

                  emailer.sendEmail({
                    from: cfg.helpDeskEmail,
                    to: cfg.feedbackBccEmail,
                    subject: strings.Emails.feedbackEmail.subject,
                    text: stringHelper.format(strings.Emails.feedbackEmail.text, userDisplayName, regDoc.challengeName),
                    html: stringHelper.format(strings.Emails.feedbackEmail.html, userDisplayName, regDoc.challengeName)
                  });
                  res.redirect('/profile/' + req.user.username + '/manage/solutions/' + regDoc.id);
                }
              });
            }
          });
        }
      });
    }
  },
  update: {
    get: function (req, res) {
      _getFeedbackViewData(req, res, 'registration/admin-resumeFeedback');
    },
    post: function (req, res) {
      registrationModel.findOne({'_id': req.params.id}, function (findErr, regDoc) {
        problemModel.findOne({'_id': regDoc.challengeID}, function (findErr, problemDoc) {
          if (findErr) {
            logger.error(findErr);
          }
          var parameters = {};
          if (req.body.operation === 'Save Draft') {
            parameters.isDraft = true;
          } else {
            parameters.isDraft = false;
          }

          var feedbackAreas = {};
          feedbackAreas = registrationController.helpers.processFeedbackFields(req.body);
          var isodate = new Date().toISOString()

          parameters.feedbackAreas = feedbackAreas;
          parameters.summary = req.body.summary;
          parameters.feedbackDoc = req.files.feedbackDoc;
          parameters.otherDocuments = req.files.otherDocuments;
          parameters.date_created = isodate;
          feedbackUpdate(regDoc, problemDoc, parameters, function (err, regDoc) {
            res.redirect('/profile/' + req.user.username + '/manage/solutions/' + regDoc.id);
          });
        });
      });
    }
  },
  removeDocument: {
    post: function (req, res) {
      _getByParamsID(req, function (err, regDoc) {
        if (err) {
          res.status(httpStatus.INTERNAL_SERVER_ERROR).json('Server error. Please try again at a later time.');
        }
        else if (!regDoc) {
          res.status(httpStatus.OK).json('There is no document with the given ID.');
        }
        else {
          feedbackRemoveFeedbackDocument(regDoc, req.params.feedbackid, req.params.feedbackdocumentname, function (msg) {
            res.status(httpStatus.OK).json(msg);
          });
        }
      });
    }
  },
  removeOtherDocuments: {
    post: function (req, res) {
      _getByParamsID(req, function (err, regDoc) {
        if (err) {
          res.status(httpStatus.INTERNAL_SERVER_ERROR).json('Server error. Please try again at a later time.');
        }
        else if (!regDoc) {
          res.status(httpStatus.OK).json('There is no document with the given ID.');
        }
        else {
          feedbackRemoveOtherDocument(regDoc, req.params.feedbackid, req.params.otherdocumentname, function (msg) {
            res.status(httpStatus.OK).json(msg);
          });
        }
      });
    }
  }
};


module.exports = registrationController;
