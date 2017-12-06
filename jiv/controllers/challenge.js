var problem = require('../models/challenges'),
  problemModel = problem.model,
  problemCreator = problem.creator,
  communityModel = require('../models/communities').model,
  problemUpdater = problem.update,
  problemDeletor = problem.remove,
  problemRemoveDoc = problem.removeDocument,
  problemAddDate = problem.addDate,
  problemRemoveDate = problem.removeDate,
  problemAddFeedback = problem.addFeedback,
  problemRemoveFeedback = problem.removeFeedback,
  validateProblemSubmissionFields = require('../utils/validation').validateProblemSubmissionFields,
  organizations = require('../models/organizations').model,
  organizationRoles = require('../models/organizations').roles,
  organizationController = require('./organization'),
  Registrations = require('../models/registrations').Registration,
  registrationFactory = require('../models/registrations').creator,
  registrationHelpers = require('./registration').helpers,
  Feedback = require('../models/feedback').Feedback,
  accounts = require('../models/accounts').model,
  accountRoles = require('../models/accounts').roles,
  accountModel = require('../models/accounts').model,
  capabilities = require('../models/products').model,
  cfg = require('../config'),
  stringHelper = require('../utils/stringHelpers'),
  path = require('path'),
  emailer = require('../utils/emailer'),
  validator = require('../utils/validation'),
  httpStatus = require('http-status'),
  accountController = require('./account'),
  logger = require('../utils/logger'),
  notifier = require('../utils/notifier')
  strings = require('../config/strings'),
  docHlpr = require('../utils/documentHelper'),
  ObjectID = require('mongoose').Types.ObjectId,
  objectTools = require('../utils/objectTools'),
  disqusSSO = require('../utils/disqus.js');

var _getUserProblemList = function (req, res, approvedOnly, title, view, msg, isModalMsg, isAlert, formData) {
  var searchCriteria = {};
  if (approvedOnly) {
    searchCriteria = {approved: true};
  }
  problemModel.find(searchCriteria, {}).sort({startDate: 'asc'}).exec(function (err, docs) {
    organizations.find({}, function (err, orgs) {
      if (err) {
        logger.error(err);
      }

      res.render(view, {
        title: title,
        message: msg,
        isChallengeModalMsg: isModalMsg,
        isAlert: isAlert,
        formData: formData,
        challenges: docs,
        orgs: orgs
      });
    });
  });
};

var _getUserProblem = function (req, res, title, view, msg, isModalMsg, isAlert, formData, checkActive) {
  var findProblemQuery = {'_id': req.params.id};
  if (checkActive) { findProblemQuery.approved = true; }
  problemModel.findOne(findProblemQuery, function (problemFindErr, problemDoc) {
    if (!problemDoc) {
      res.render('404');
      return;
    }
    communityModel.findOne({discoveries: problemDoc._id}, function (commErr, commDoc) {
      if (problemFindErr || commErr) {
        logger.error(problemFindErr || commErr);
        _getUserProblemList(req, res, true, 'Problem Administration', 'Could not retrieve your problem at this time', false, true);
      }
      else {
        organizations.find({}, function (err, orgDocs) {
          if (!problemDoc) {
            _getUserProblemList(req, res, true, 'Problem Administration', 'Could not retrieve your problem at this time', false, true);
          }
          if (req.user) {
            capabilities.find({orgRef: req.user.orgRef, approved: true}, function (capabilityFindErr, capabilityDocs) {
              organizations.findOne({_id: problemDoc.orgRef}, function (orgErr, orgDoc) {
                accounts.find({orgRef: orgDoc._id}, function (accountErr, orgUsers) {
                  accounts.find({_id: {$in: problemDoc.discoveryManagers}}, function(managerErr, managers) {
                    accounts.find({_id: {$in: problemDoc.discoveryEvaluators}}, function(evalErr, evaluators){

                      if (capabilityFindErr) {
                        logger.error(capabilityFindErr);
                      }

                      if (orgDoc) {
                        problemDoc.orgName = orgDoc.orgName;
                      }
                      problemDoc.schedule.sort(function (d1, d2) {
                        return d1.startDate - d2.startDate;
                      });
                      res.render(view, {
                        title: title,
                        discovery: problemDoc,
                        products: capabilityDocs,
                        organizations: orgDocs,
                        disqusSSO: disqusSSO.getDisqusSSO(res),
                        disqusShortName: cfg.disqus.shortname,
                        uniqueID: problemDoc._id,
                        isRegisterModalMsg: isModalMsg,
                        message: msg,
                        community: commDoc,
                        organizationUsers: orgUsers,
                        managers: managers,
                        evaluators: evaluators
                      });
                    });
                  });
                });
              });
            });
          }
          else {
            res.render(view, {
              title: title,
              discovery: problemDoc,
              isChallengeModalMsg: isModalMsg,
              isAlert: isAlert,
              formData: formData,
              organizations: orgDocs,
              community: commDoc
            });
          }
        });
      }
    });
  });
};

var _getRegistrations = function (req, res, view) {

  problemModel.findOne({'_id': req.params.id}, function (problemFindErr, doc) {
    Registrations.find({challengeID: req.params.id}, function (err, regDocs) {
      organizations.find({}, function (orgErr, orgDocs) {
        accounts.find({}, function(accountErr, accountDocs) {
          var renderObj = {title: 'Solution Submission', stage: doc.stage, challenge: doc, orgs: orgDocs, accounts: accountDocs};
          if (err) {
            logger.error(err);
          }
          if (regDocs) {
            renderObj.registrations = regDocs;
          }
          res.render(view, renderObj);
        });
      });
    });
  });
};

problemController = {user: {}, admin: {}, registration: {}, userList: {}, register: {}, api: {}};

problemController.list = {
  get: function (req, res) {
    _getUserProblemList(req, res, true, 'Problems', 'discovery/user-list');
  },
  post: function (req, res) {
    problemCreator(req.body.name, req.user.orgRef, req.body.pocName, req.body.pocEmail,
      req.body.description, req.body.requirements,
      req.body.days, req.files.documents,
      function (err) {
        var message = cfg.problemSubmitResponse;
        var isAlert = false;
        var formData = undefined;
        if (err) {
          logger.error(err);
          message = err.message;
          isAlert = true;
          formData = req.body;
        }
        _getUserProblemList(req, res, true, 'Problem', 'discovery/user-list', message, true, isAlert, formData);
      }
    );
  }
};

problemController.view = {
  get: function (req, res) {
    _getUserProblem(req, res, 'Problem Administration View', 'discovery/user-view', null, null, null, null, true);
  }
};

problemController.register = {
  post: function (req, res) {
    communityModel.findOne({
      discoveries: ObjectID(req.params.id),
      members: ObjectID(req.user.orgRef)
    }, function (commErr, commDoc) {
      problemModel.findOne({
        _id: ObjectID(req.params.id)
      }, function (commErr, challDoc) {

        if (commDoc) {
          var newRegObj = new Registrations();
          newRegObj.challengeID = req.params.id;
          newRegObj.productID = req.body.capabilityId;
          newRegObj.orgRef = req.user.orgRef;
          newRegObj.pocName = req.body.pocName;
          newRegObj.pocEmail = req.body.pocEmail;
          newRegObj.description = req.body.description;
          newRegObj.accessInstructions = req.body.accessInstructions;
          newRegObj.customFieldResponse = registrationHelpers.processCustomFields(req.body);
          newRegObj.whitepaper = registrationHelpers.processWhitepaperUploads(req.files);
          newRegObj.otherDocuments = registrationHelpers.processOtherDocumentationUploads(req.files);
          registrationFactory(newRegObj, function (err, formData) {
            if (err) {
              logger.error(err);
              res.status(httpStatus.INTERNAL_SERVER_ERROR)
                .json({message: err.message});
            }
            else {
              var userName = req.user.firstName + ' ' + req.user.lastName;
              var userEmail = req.user.email;
              notifier.notifyRegistration(commDoc, newRegObj, challDoc, userName, userEmail);
              res.status(httpStatus.ACCEPTED)
                .json({message: cfg.registerationResponse});
            }
          });
        }
        else {
          res.status(httpStatus.INTERNAL_SERVER_ERROR)
            .json({message: 'Please join the community this belongs to in order to register'});
        }
      });
    });
  }
};

problemController.user.list = {
  get: function (req, res) {
    _getUserProblemList(req, res, true, 'Problems', 'discovery/user-list');
  },
  post: function (req, res) {
    organizations.findOne({orgDuns: req.user.orgDuns, orgRole: /Client|Both/i}, function (orgErr, orgDoc) {
      if (orgErr || !orgDoc) {
        logger.error(err);
        var message = 'You do not have the permissions to perform this action';
        var isAlert = true;
        var formData = req.body;
        _getUserProblemList(req, res, true, 'Problem', 'discovery/user-list', message, true, isAlert, formData);
      }
      problemCreator(req.body.name, req.user.orgDuns, req.body.pocName, req.body.pocEmail,
        req.body.description, req.body.requirements,
        req.body.days, req.files.documents,
        function (err) {
          var message = cfg.problemSubmitResponse;
          var isAlert = false;
          var formData = undefined;
          if (err) {
            logger.error(err);
            message = err.message;
            isAlert = true;
            formData = req.body;
          }
          else {
            var text = stringHelper.format(strings.Emails.newProblem.text,
              (req.user.firstName + ' ' + req.user.lastName + ' (ID: ' + req.user.orgRef + ')'));
            emailer.sendEmail({
              from: cfg.helpDeskEmail,
              to: cfg.helpDeskEmail,
              subject: strings.Emails.newProblem.subject,
              text: text,
              html: strings.Emails.newProblem.html
            });
          }
          _getUserProblemList(req, res, true, 'Problem', 'discovery/user-list', message, true, isAlert, formData);
        }
      );
    });
  }
};

problemController.user.update = {
  get: function (req, res) {
    _getUserProblem(req, res, 'Problem Administration Update', 'discovery/user-update');
  },
  post: function (req, res) {

    problemUpdater(req.params.id, req.body.name, req.user.orgRef, req.body.pocName, req.body.pocEmail,
      req.body.description, req.body.requirements,
      req.body.days, req.files.documents, req.body.startDate,
      req.body.evaluationCriteria, req.body.summary, req.body.stage,
      req.body.categories, req.body.endDate, req.body.regEndDate, req.body.thumbnail, req.body.discoveryManagers,
      req.body.discoveryEvaluators, req.body.optradio, req.body.isDraft,
      function (err, problemDoc) {
          if (err) {
              
            res.status(500).send({message: err.message});
        }else{
              res.send({data: problemDoc});
              }
      });
  },
};
problemController.user.challengeview = {
  get: function (req, res) {
    _getUserProblem(req, res, 'Problem User View', 'discovery/dashboard-view');
  }
};

problemController.user.delete = {
  get: function (req, res) {
    _getUserProblem(req, res, 'Problem Administration Delete', 'discovery/user-delete');
  },
  post: function (req, res) {
    problemDeletor(req.params.id, function (err) {
      if (err) {
        logger.error(err);
      }
      else {
        accountController.manage.get(req, res);
      }
    });
  }
};

//TODO : figure out if this can be refactored to use another method
problemController.registration.view = {
  get: function (req, res) {
    _getRegistrations(req, res, 'discovery/user-registrationlist');
  }
};
problemController.userList.view = {
  get: function (req, res) {
    problemModel.findOne({'_id': req.params.id}, function (problemFindErr, doc) {
      accounts.find({'orgRef': req.user.orgRef}).lean().exec(function (err, users) {
        organizations.find({}, function (orgErr, orgDocs) {
          var renderObj = {title: 'Problem Users', discovery: doc, orgs: orgDocs};
          if (err) {
            logger.error(err);
          }
          if (users) {
            renderObj.users = users;
          }
          res.render('discovery/user-discoveryUsers', renderObj);
        });
      });
    });
  }
};
problemController.userList.discoveryManager = function (req, res) {
  accounts.findById(req.body.id, function (err, obj) {
    accounts.findById(req.body.id, function (err, doc) {
      problemModel.findById(req.body.challengeID, function (err, chal) {
        if (chal) {
          if (req.body.discoveryManager == 'true') {
            chal.discoveryManagers.push(req.body.id);
          } else {
            var memberIdx = chal.discoveryManagers.indexOf(req.body.id);
            if (memberIdx > -1) {
              chal.discoveryManagers.splice(memberIdx, 1);
            }
          }
          chal.save(function (chalErr) {
            if (chalErr) {
              res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'There was an error with your request'});
            }
          });
        }
        if (obj) {
          doc.roles = [];

          if (obj.roles[0] == 'admin' || obj.roles[0] == 'user' || obj.roles[0] == 'organizationManager' || obj.roles[0] == 'discoveryEvaluator') {
            doc.roles.push(obj.roles[0]);
          }
          if (obj.roles[1] == 'admin' || obj.roles[1] == 'user' || obj.roles[1] == 'organizationManager' || obj.roles[1] == 'discoveryEvaluator') {
            doc.roles.push(obj.roles[1]);
          }
          if (obj.roles[2] == 'admin' || obj.roles[2] == 'user' || obj.roles[2] == 'organizationManager' || obj.roles[2] == 'discoveryEvaluator') {
            doc.roles.push(obj.roles[2]);
          }
          if (obj.roles[3] == 'admin' || obj.roles[3] == 'user' || obj.roles[3] == 'organizationManager' || obj.roles[3] == 'discoveryEvaluator') {
            doc.roles.push(obj.roles[3]);
          }
          console.log(req.body.discoveryManager);
          if (req.body.discoveryManager == 'true') {
            doc.roles.push(accountRoles.discoveryManager);
          }

          doc.save(function (saveErr) {
            if (saveErr) {
              res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'There was an error with your request'});
            }
            else {
              res.status(httpStatus.ACCEPTED).json({message: 'Organization manager status has been changed.'});
            }
          });
        }
      });
    });
  });
};
problemController.userList.discoveryEvaluator = function (req, res) {
  accounts.findById(req.body.id, function (err, obj) {
    accounts.findById(req.body.id, function (err, doc) {
      problemModel.findById(req.body.challengeID, function (err, chal) {
        if (chal) {
          if (req.body.discoveryEvaluator == 'true') {
            chal.discoveryEvaluators.push(req.body.id);
          } else {
            var memberIdx = chal.discoveryEvaluators.indexOf(req.body.id);
            if (memberIdx > -1) {
              chal.discoveryEvaluators.splice(memberIdx, 1);
            }
          }
          chal.save(function (chalErr) {
            if (chalErr) {
              res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'There was an error with your request'});
            }
          });
        }
        if (obj) {
          doc.roles = [];

          if (obj.roles[0] == 'admin' || obj.roles[0] == 'user' || obj.roles[0] == 'organizationManager' || obj.roles[0] == 'discoveryManager') {
            doc.roles.push(obj.roles[0]);
          }
          if (obj.roles[1] == 'admin' || obj.roles[1] == 'user' || obj.roles[1] == 'organizationManager' || obj.roles[1] == 'discoveryManager') {
            doc.roles.push(obj.roles[1]);
          }
          if (obj.roles[2] == 'admin' || obj.roles[2] == 'user' || obj.roles[2] == 'organizationManager' || obj.roles[2] == 'discoveryManager') {
            doc.roles.push(obj.roles[2]);
          }
          if (obj.roles[3] == 'admin' || obj.roles[3] == 'user' || obj.roles[3] == 'organizationManager' || obj.roles[3] == 'discoveryManager') {
            doc.roles.push(obj.roles[3]);
          }

          if (req.body.discoveryEvaluator == 'true') {

            doc.roles.push(accountRoles.discoveryEvaluator);
          }

          doc.save(function (saveErr) {
            if (saveErr) {
              res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'There was an error with your request'});
            }
            else {
              res.status(httpStatus.ACCEPTED).json({message: 'Organization manager status has been changed.'});
            }
          });
        }
      });
    });
  });
};

problemController.document = {
  get: function (req, res) {
    docHlpr.getDataFromS3(req, res, '/docs');
  }
};

problemController.admin.list = {
  get: function (req, res) {
    problemModel.find({}, function (err, challengeDocs) {
      var renderObj = {title: '', challenges: challengeDocs};
      res.render('discovery/admin-list', renderObj);
    });
  }
};

problemController.admin.create = {
  get: function (req, res) {
    _HelperGetInfo(req, res, 'discovery/admin-create');
  },
  post: function (req, res) {
    if (!req.body.communityID) {
      res.status(httpStatus.BAD_REQUEST)
        .json({message: 'Please provide a community ID.'});
    }
    else {
      communityModel.findOne({_id: req.body.communityID}, function (err, communityDoc) {
        var errorObj = validateProblemSubmissionFields(req);
        if (Object.keys(errorObj).length > 0) {
          res.status(httpStatus.BAD_REQUEST).json(errorObj);
        }
        else {
          var newProblem = new problem.model();
          newProblem.orgRef = req.user.orgRef;
          newProblem.name = req.body.name;
          newProblem.pocName = req.body.pocName;
          newProblem.pocEmail = req.body.pocEmail;
          newProblem.summary = req.body.summary;
          newProblem.description = req.body.description; // TODO: Test this: sanitizeHtml(req.body.description);
          newProblem.startDate = req.body.startDate;
          newProblem.endDate = req.body.endDate;
          newProblem.requirementDescription = req.body.requirements;
          var solutionSubmissionEndDate = new Date(req.body.endDate);
          solutionSubmissionEndDate.setHours(23, 59, 59, 999);
          newProblem.regEndDate = solutionSubmissionEndDate;

          if (req.body.category) {
            newProblem.categories = req.body.category.split(',');
          }
          newProblem.documents = [];

          if (req.files.documents) {
            var documents = _handleFileUpload(req.files.documents);
            if (typeof documents === 'object') {
              newProblem.documents.push(documents);
            }
            else if (documents === Array) {
              newProblem.documents = documents;
            }
          }

          if (req.body.thumbnail) {
            var mimeType  = req.body.thumbnail.match(/(image\/.*);/)[1];
            var extension = req.body.thumbnail.match(/image\/(.*);/)[1];
            if (cfg.validUploadMimeTypes.indexOf(mimeType) > -1) {
              var name             = 'discovery_thumbnail_' + newProblem.name + '.' + extension;
              var path             = '/images/' + name;
              newProblem.thumbnail = {name: name, mimetype: mimeType, path: path, date_created: new Date()};
              docHlpr.saveDataUrl(cfg.imageUploadDir + '/discovery_thumbnail_' + newProblem.name, req.body.thumbnail);
            }
          }

          var des = [];
          var dms = [];
          if (req.body.discoveryEvaluators) {
            des = req.body.discoveryEvaluators.split(', ');
          }
          if (req.body.discoveryManagers) {
            dms = req.body.discoveryManagers.split(', ');
          }

          accountModel.find({_id: {$in: dms}}, function (dmUserError, dmUsers) {
            accountModel.find({_id: {$in: des}}, function (deUserError, deUsers) {
              if (dmUserError) {
                res.status(httpStatus.INTERNAL_SERVER_ERROR)
                  .json({message: dmUserError.message});
              }
              else if (deUserError) {
                res.status(httpStatus.INTERNAL_SERVER_ERROR)
                  .json({message: deUserError.message});
              }
              else {
                for (var i = 0; i < dmUsers.length; i++) {
                  newProblem.discoveryManagers.addToSet(dmUsers[i]._id.toString());
                }
                for (var i = 0; i < deUsers.length; i++) {
                  newProblem.discoveryEvaluators.addToSet(deUsers[i]._id.toString());
                }
                problem.creator(newProblem, function (err, newProblem) {
                  if (err) {
                    res.status(httpStatus.INTERNAL_SERVER_ERROR)
                      .json({message: err.message});
                  }
                  else {
                    communityDoc.discoveries.push(newProblem.id);
                    communityDoc.save(function (saveErr) {
                      if (saveErr) {
                        logger.error(saveErr);
                        res.status(httpStatus.INTERNAL_SERVER_ERROR)
                          .json({message: 'Could not process your request at this time.'});
                      }
                      else {
                        res.status(httpStatus.ACCEPTED)
                          .json({message: 'Successful'});
                      }
                    });
                  }
                });
              }
            });
          });
        }
      });
    }

    /*problemCreator(req.body.name, req.user.orgRef, req.body.pocName, req.body.pocEmail,
      req.body.description, req.body.requirements,
      req.body.days, req.files.documents,
      function (err) {
        var message = cfg.problemSubmitResponse;
        var isAlert = false;
        var formData = undefined;
        if (err) {
          logger.error(err);
          res.render('discovery/admin-create', {
            title: 'Create New Problem',
            message: err.message,
            isAlert: true,
            formData: req.body
          });
        }
        res.redirect('/admin/problems/');
      }
    );*/
    //res.status(200).json({message: errObj});
  }
};

problemController.admin.read = {
  get: function (req, res) {
    _getUserProblem(req, res, 'Problem Admin', 'discovery/dashboard-view');
  }
};

problemController.admin.update = {
  get: function (req, res) {
    _getUserProblem(req, res, 'Problem Administration Update', 'discovery/admin-update');
  },
  post: function (req, res) {
    problemUpdater(req.params.id, req.body.name, req.body.orgRef, req.body.pocName, req.body.pocEmail,
      req.body.description, req.body.requirements,
      req.body.days, req.files.documents, req.body.startDate,
      req.body.evaluationCriteria, req.body.summary, req.body.stage, req.body.categories, req.body.endDate, req.body.regEndDate, req.body.thumbnail,
      req.body.discoveryManagers, req.body.discoveryEvaluators, req.body.optradio, null,
      function (err) {
        if (err) {
          //TODO: Do this
        }
        _getUserProblem(req, res, 'Problem Administration Update', 'discovery/admin-update');
      });
  }
};

problemController.admin.delete = {
  get: function (req, res) {
    _getUserProblem(req, res, 'Problem Administration Delete', 'discovery/admin-delete');
  },
  post: function (req, res) {
    problemDeletor(req.params.id, function (err) {
      if (err) {
        logger.error(err);
      }
      else {
        res.redirect('/admin/problems/');
      }
    });
  }
};

problemController.admin.registrations = {
  view: {
    get: function (req, res) {
      _getRegistrations(req, res, 'discovery/admin-registrationlist');
    }
  }
};

//NOTE: The point of this is in the RARE/UNLIKELY/MORE THEN LIKELY NOT GONNA HAPPEN chance we get to move this
//  back to API driven it will be a little simpler to do or at least see some thing
problemController.api = {
  isApproved: {
    get: function (req, res) {
      problemModel.findById(req.body.id, function (err, doc) {
        if (doc) {
          doc.approved = req.body.approved;
          doc.save(function (saveErr) {
            if (saveErr) {
              res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'Cannot mark the problem approved.'});
            }
            else if (doc.approved) {
              res.status(httpStatus.ACCEPTED).json({message: 'Problem is marked approved'});
            } else {
              res.status(httpStatus.ACCEPTED).json({message: 'Capability is not approved.'});
            }
          });
        }
      });
    }
  },
  getCustomFields: {
    get: function (req, res) {
      if (!req.params.id) {
        res.status(httpStatus.BAD_REQUEST)
          .json({message: 'Please include the problem id'});
      }
      else {
        var allowedRoles = [organizationRoles.both, organizationRoles.communityOwner, organizationRoles.client];
        if (allowedRoles.indexOf(res.locals.userinfo.orgRole) <= -1 && req.user.roles.indexOf('admin') <= -1) {
          res.status(httpStatus.UNAUTHORIZED)
            .json({message: 'Administrators, Explorers, and Community owners are the only ones with permissions to perform this action.'});
        }
        else {
          problemModel.findOne({_id: req.params.id}, function (err, problemDoc) {
            if (err) {
              logger.error(err);
              res.status(httpStatus.INTERNAL_SERVER_ERROR).
                json({message: 'Cannot save your fields at this time'});
            }
            else {
              res.status(httpStatus.ACCEPTED)
                .json({fields: problemDoc.customRegistrationFields});
            }
          });
        }
      }
    }
  },
  updateCustomFields: {
    post: function (req, res) {
      if (!req.body.discoveryId) {
        res.status(httpStatus.BAD_REQUEST)
          .json({message: 'Please include the problem id'});
      }
      else {
        var allowedRoles = [organizationRoles.both, organizationRoles.communityOwner, organizationRoles.client];
        if (allowedRoles.indexOf(res.locals.userinfo.orgRole) <= -1 && req.user.roles.indexOf('admin') <= -1) {
          res.status(httpStatus.BAD_REQUEST)
            .json({message: 'Explorers and Community owners are the only ones with permissions to perform this action.'});
        }
        else {
          problemModel.findOne({_id: req.body.discoveryId}, function (err, problemDoc) {
            if (err) {
              logger.error(err);
              res.status(httpStatus.INTERNAL_SERVER_ERROR).
                json({message: 'Cannot save your fields at this time'});
            }
            else {
              problemDoc.customRegistrationFields = req.body.fields;
              problemDoc.save(function (saveErr) {
                if (saveErr) {
                  logger.error(saveErr);
                  res.status(httpStatus.INTERNAL_SERVER_ERROR).
                    json({message: 'Cannot save your fields at this time'});
                }
                else {
                  res.status(httpStatus.ACCEPTED)
                    .json({message: 'Fields successfully saved.'});
                }
              });
            }
          });
        }
      }
    }
  },
  addDate: {
    post: function (req, res) {
      //TODO : move to an API call.
      try {
        problemAddDate(req.body.challengeID, req.body.startDate, req.body.endDate, req.body.description, function (data) {
          res.status(data.status)
            .json(data.results)
            .end();
        });
      }
      catch (err) {
        logger.error(err);
        res.status(httpStatus.INTERNAL_SERVER_ERROR)
          .json({message: 'Cannot process your request at this time.'})
          .end();
      }
    }
  },
  removeDate: {
    post: function (req, res) {
      if (!req.body.eventID || !req.body.challengeID) {
        res.status(httpStatus.BAD_REQUEST).json({
          message: 'Please include a event id and challenge ID'
        });
      }
      else {
        problemRemoveDate(req.body.challengeID, req.body.eventID, function (data) {
          res.status(data.status)
            .json(data.results)
            .end();
        });
      }
    }
  },
  addFeedback: {
    post: function (req, res) {
      //TODO : move to an API call.
      try {
        problemAddFeedback(req.body.challengeID, req.body.description, function (data) {
          res.status(data.status)
            .json(data.results)
            .end();
        });
      }
      catch (err) {
        logger.error(err);
        res.status(httpStatus.INTERNAL_SERVER_ERROR)
          .json({message: 'Cannot process your request at this time.'})
          .end();
      }
    }
  },
  removeFeedback: {
    post: function (req, res) {
      //TODO : move to an API call.
      try {
        problemRemoveFeedback(req.body.challengeID, req.body.description, function (data) {
          res.status(data.status)
            .json(data.results)
            .end();
        });
      }
      catch (err) {
        logger.error(err);
        res.status(httpStatus.INTERNAL_SERVER_ERROR)
          .json({message: 'Cannot process your request at this time.'})
          .end();
      }
    }
  },
  removeDoc: {
    post: function (req, res) {
      //TODO : This should be moved to an API call
      try {
        problemRemoveDoc(req.body.docID, req.body.challengeID, function (data) {
          res.status(data.status)
            .json(data.results)
            .end();
        });
      }
      catch (err) {
        logger.error(err);
        res.status(httpStatus.INTERNAL_SERVER_ERROR)
          .json({message: 'Cannot process your request at this time.'})
          .end();
      }

    }
  },
  updateRegistrationDescription: {
    post: function (req, res) {
      if (!req.body.discoveryId) {
        res.status(httpStatus.BAD_REQUEST)
          .json({message: 'Please include the problem id'});
      }
      else {
        var allowedRoles = [organizationRoles.both, organizationRoles.communityOwner, organizationRoles.client];
        if (allowedRoles.indexOf(res.locals.userinfo.orgRole) <= -1 && req.user.roles.indexOf('admin') <= -1) {
          res.status(httpStatus.BAD_REQUEST)
            .json({message: 'Explorers and Community owners are the only ones with permissions to perform this action.'});
        }
        else {
          problemModel.findOne({_id: req.body.discoveryId}, function (err, problemDoc) {
            if (err) {
              logger.error(err);
              res.status(httpStatus.INTERNAL_SERVER_ERROR).
                json({message: 'Cannot save your description at this time'});
            }
            else {
              problemDoc.registrationDescription = req.body.registrationDescription;
              problemDoc.addWhitepaper = req.body.addWhitepaper || false;
              problemDoc.addProduct = req.body.addProduct || false;
              problemDoc.save(function (saveErr) {
                if (saveErr) {
                  logger.error(saveErr);
                  res.status(httpStatus.INTERNAL_SERVER_ERROR).
                    json({message: 'Cannot save your description at this time'});
                }
                else {
                  res.status(httpStatus.ACCEPTED)
                    .json({message: 'Fields successfully saved.'});
                }
              });
            }
          });
        }
      }
    }
  }
};

var _HelperGetInfo = function (req, res, pageView) {
  // var namePattern = {$regex: new RegExp("^" + req.params.urlNameID, "i")};
  // communityModel.findOne({$or: [{name: namePattern}, {urlFriendlyID: namePattern}]}, function (findErr, doc) {
  communityModel.findOne({urlFriendlyID: res.locals.geoIntCommunityUrlFriendlyId}, function (findErr, doc) {
    if (findErr) {
      res.render('error', {message: 'Cannot process your request at this time', error: findErr});
    }
    else if (!doc) {
      res.render('error', {message: 'Community not found.'});
    }
    else {
      organizationController.getOrganizationById(doc.owner, function (orgDoc, err) {
        if (err) {
          res.render('error', {message: 'Cannot process your request at this time', error: findErr});
        } else {
          var currentDate = new Date();
          currentDate.setDate(currentDate.getDate());
          var end = currentDate.toISOString();
          var currentStart = new Date();
          currentStart.setDate(currentStart.getDate() - 21);
          var start = currentStart.toISOString();

          _getCapabilityInformation(doc, start, end, function (docs, newCapabilities, items) {
            _getMemberInformation(doc, orgDoc, function (err, oldOrgs, newOrgs) {
              _getProblemInformation(doc, function (problems, problemCategories) {
                helperFunctions.getTopNewsCategories(res.locals.geoIntCommunityUrlFriendlyId, function (newCategoryErr, newsTopCategories) {
                  helperFunctions.getTopNewsStory(res.locals.geoIntCommunityUrlFriendlyId, function (newsTopSotrys, newsTopStories) {
                    helperFunctions.getAllNewsArticles(res.locals.geoIntCommunityUrlFriendlyId, function (allNewsErr, allNews) {
                      var userID;
                      if (req.user) {
                        userID = req.user.orgRef;
                      } else {
                        userID = orgDoc._id;
                      }
                      accountModel.find({orgRef: userID, approved: true}, function (orgUsersError, orgUsers) {
                        if (newCategoryErr) {
                          logger.log(newCategoryErr);
                        }
                        docs = docs || [orgDoc];
                        for (var idx in docs) {
                          if (docs[idx]._id.toString() === orgDoc._id.toString()) {
                            docs.splice(idx, 1);
                          }
                        }
                        docs.unshift(orgDoc);

                        newCapabilities = newCapabilities || [orgDoc];
                        for (var idx in newCapabilities) {
                          if (newCapabilities[idx]._id.toString() === orgDoc._id.toString()) {
                            newCapabilities.splice(idx, 1);
                          }
                        }
                        newCapabilities.unshift(orgDoc);

                        var editOrgRef = null;
                        if (typeof req.user != 'undefined') {
                          editOrgRef = orgDoc.id == req.user.orgRef;
                        }

                        res.render(pageView, {
                          community: doc,
                          discoveries: problems,
                          organization: orgDoc,
                          members: oldOrgs,
                          newMembers: newOrgs,
                          memberRoles: Object.keys(organizationRoles),
                          newProducts: newCapabilities,
                          products: docs,
                          discoveryCategories: problemCategories,
                          newsTopCategories: newsTopCategories,
                          newsTopStories: newsTopStories,
                          categories: items,
                          newsFilter: req.query['news-filter'] || "",
                          newsKeyword: req.query['news-keyword'] || "",
                          editMode: req.params.edit == 'edit' && res.locals.isOrgAdmin,
                          canEdit: editOrgRef,
                          allNews: allNews,
                          organizationUsers: orgUsers,
                          canCreateProblem: (function () {
                            if (req.user) {
                              return orgDoc.orgRole === 'client' || orgDoc.orgRole === 'both' || orgDoc.orgRole === 'communityowner' || doc.owner.toString() === req.user.orgRef.toString()
                            } else {
                              return false;
                            }
                          })()
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        }
      });
    }
  });
};

var _getCapabilityInformation = function (doc, start, end, callback) {
  capabilityModel.find({
    _id: {$in: doc.solutions},
    approved: true,
    date_created: {$lt: start}
  }).sort("name").exec(function (e, docs) {
    capabilityModel.find({
      _id: {$in: doc.solutions},
      approved: true,
      date_created: {$gte: start, $lt: end}
    }).sort("name").exec(function (e, newCapabilities) {
      capabilityModel.distinct('category', {_id: {$in: doc.solutions}}, function (err, items) {
        items.sort(function (a, b) {
          return a.toLowerCase().localeCompare(b.toLowerCase());
        });

        var normalizedCategories = [];

        var capabilitiesString = JSON.stringify(items);
        var capabilitiesArray = capabilitiesString.split(',');
        for (var i = 0; i < capabilitiesArray.length; i++) {
          capabilitiesArray[i].capabilityNameSort = capabilitiesArray[i].toLowerCase();
          normalizedCategories.push(capabilitiesArray[i]);
        }
        capabilitiesArray = objectTools.sortByKey(capabilitiesArray, 'capabilityNameSort');

        var normalizedCapabilitiesDocsNew = [];
        for (var i = 0; i < newCapabilities.length; i++) {
          newCapabilities[i].capabilityNameSort = newCapabilities[i].name.toLowerCase();
          normalizedCapabilitiesDocsNew.push(newCapabilities[i]);
        }

        var normalizedCapabilitiesDocs = [];
        for (var i = 0; i < docs.length; i++) {
          docs[i].capabilityNameSort = docs[i].name.toLowerCase();
          normalizedCapabilitiesDocs.push(docs[i]);
        }

        docs = objectTools.sortByKey(docs, 'capabilityNameSort');

        newCapabilities = objectTools.sortByKey(newCapabilities, 'capabilityNameSort');

        _getCapabilityCount(doc, function () {
          callback(docs, newCapabilities, items);
        });
      });
    });
  });
};

var _getCapabilityCount = function (doc, callback) {
  capabilityModel.find({
    _id: {$in: doc.solutions},
    approved: true
  }, function (problemFindErr, capabilities) {
    doc.set('productLength', capabilities.length);
    callback();
  });
};

var _getMemberInformation = function (doc, orgDoc, callback) {
  var currentDate = new Date();
  currentDate.setDate(currentDate.getDate());
  var end = currentDate.toISOString();
  var currentStart = new Date();
  currentStart.setDate(currentStart.getDate() - 21);
  var start = currentStart.toISOString();
  organizationModel.find({
    approved: true,
    _id: {$in: doc.members},
    dateCreated: {$lt: start}
  }).sort("orgName").exec(function (e, oldOrgs) {
    organizationModel.find({
      approved: true,
      _id: {$in: doc.members},
      dateCreated: {$gte: start, $lt: end}
    }).sort("orgName").exec(function (e, newOrgs) {

      var normalizedOrgsNew = [];
      for (var i = 0; i < newOrgs.length; i++) {
        newOrgs[i].capabilityNameSort = newOrgs[i].orgName.toLowerCase();
        normalizedOrgsNew.push(newOrgs[i]);
      }

      var normalizedOrgDocs = [];
      for (var i = 0; i < oldOrgs.length; i++) {
        oldOrgs[i].capabilityNameSort = oldOrgs[i].orgName.toLowerCase();
        normalizedOrgDocs.push(oldOrgs[i]);
      }

      newOrgs = objectTools.sortByKey(newOrgs, 'capabilityNameSort');

      oldOrgs = objectTools.sortByKey(oldOrgs, 'capabilityNameSort');



      callback(e, oldOrgs, newOrgs);
    });
  });
};

var _getProblemInformation = function (doc, callback) {
  problemModel.find({_id: {$in: doc.discoveries}, approved: true}).sort({endDate: 1}).exec(function (problemFindErr, problems) {
    problemModel.distinct('categories', {_id: {$in: doc.discoveries}, approved: true}, function (err, problemCategories) {
      if (problemFindErr) {
        logger.error(problemFindErr);
      }
      if (!problems) {
        problems = [];
      }

      _getProblemCount(doc, function () {
        callback(problems, problemCategories);
      });
    });
  });
};

var _getProblemCount = function (doc, callback) {
  problemModel.find({
    _id: {$in: doc.discoveries},
    approved: true
  }, function (problemFindErr, problems) {
    doc.set('discoveryLength', problems.length);
    callback();
  });
};

var _handleFileUpload = function (file) {
  var processedDocument;
  if (file === Array) {
    processedDocument = [];
    for (var i = 0; i < file.length; i++) {

      var docObj = {
        name: documents[i].originalname,
        mimeType: documents[i].mimetype,
        path: cfg.problemDocURL + '/' + documents[i].name
      };
      processedDocument.push(docObj);
    }
  }
  else if (typeof file === 'object') {

    processedDocument = {
      mimetype: file.mimetype,
      name: file.originalname,
      path: cfg.problemDocURL + '/' + file.name
    };
  }
  return processedDocument;
};

var helperFunctions = {
  getAllNewsArticles: function (communityID, callback) {
    var query = [
      {
        "$unwind": "$news"
      },
      {
        "$project": {
          "communityID": "$id",
          "owner": "$owner",
          "communityUrlFriendlyID": "$urlFriendlyID",
          "communityName": "$name",
          "publishedBy": "$news.publishedBy",
          "newsUrlFriendlyID": '$news.urlFriendlyID',
          "headline": "$news.headline",
          "releaseDate": "$news.releaseDate",
          "content": "$news.content",
          "approved": "$news.approved",
          "image": "$news.image",
          "categories": "$news.categories",
          "isPrivate": "$news.isPrivate"

        }
      }
      ,
      {
        "$sort":
          {
            releaseDate: -1
          }
      }
    ];

    if (communityID) {
      query.unshift({$match: {urlFriendlyID: communityID}})
    }
    communityModel.aggregate(query, function (err, results) {
      callback(err, results);
    });
  },
  getTopNewsCategories: function (communityID, callback) {
    var query = [
      {$unwind: "$news"},
      {
        "$project": {
          "headline": "$news.headline",
          "releaseDate": "$news.releaseDate",
          "categories": "$news.categories",
          "approved": "$news.approved"
        }
      },
      {$match: {"approved": true}},
      {$match: {"releaseDate": {"$lt": new Date(Date.now())}}},
      {$unwind: '$categories'},
      {$group: {_id: "$categories", number: {$sum: 1}}},
      {$sort: {number: -1}},
      {$limit: 5}
    ];
    if (communityID) {
      query.unshift({$match: {urlFriendlyID: communityID}})
    }
    communityModel.aggregate(query, function (err, result) {
      callback(err, result);
    });
  },
  getTopNewsStory: function (communityID, callback) {
    var query = [
      {"$unwind": "$news"},
      {
        "$project": {
          "headline": "$news.headline",
          "releaseDate": "$news.releaseDate",
          "communityUrlFriendlyID": "$urlFriendlyID",
          "newsUrlFriendlyID": "$news.urlFriendlyID",
          "approved": "$news.approved"
        }
      },
      {$match: {"approved": true}},
      {$match: {"releaseDate": {"$lt": new Date(Date.now())}}},
      {"$sort": {"releaseDate": -1}},
      {$limit: 5}
    ];
    if (communityID) {
      query.unshift({$match: {urlFriendlyID: communityID}})
    }
    communityModel.aggregate(query, function (err, result) {
      callback(err, result);
    });
  },
  getNewsStory: function (newsID, communityID, callback) {
    var query = [
      {"$project": {"urlFriendlyID": "$urlFriendlyID", "news": "$news"}},
      {"$unwind": "$news"},
      {"$match": {"urlFriendlyID": communityID}},
      {"$match": {"news.urlFriendlyID": encodeURIComponent(newsID)}}
    ];

    communityModel.aggregate(query, function (err, results) {
      callback(err, results);
    });
  }
};

module.exports = problemController;
