var accounts = require('../models/accounts').model,
  accountsCreator = require('../models/accounts').creator,
  accountRoles = require('../models/accounts').roles,
  organizations = require('../models/organizations').model,
  isDisplayable = require('../models/organizations').isDisplayable,
  orgRemoveImage = require('../models/organizations').removeImage,
  orgAddImage = require('../models/organizations').addImage,
  organizationRoles = require('../models/organizations').roles,
  validate = require('../utils/signup-field-validation'),
  capabilities = require('../models/products').model,
  capabilityCreator = require('../models/products').creator,
  problems = require('../models/challenges').model,
  registration = require('../models/registrations').Registration,
  problemCreator = require('../models/challenges').creator,
  communityModel = require('../models/communities').model,
  getCommunityMetrics = require('../controllers/community').getCommunityMetrics,
  communitiesInsertOrganizationIntoGsm = require('../controllers/community').insertOrganizationIntoGsm,
  logger = require('../utils/logger'),
  orgController = require('./organization'),
  auth = require('../auth'),
  httpStatus = require('http-status'),
  emailer = require('../utils/emailer'),
  fs = require('fs'),
  path = require('path'),
  cfg = require('../config'),
  uuid = require('node-uuid'),
  objectTools = require('../utils/objectTools'),
  mongoose = require('mongoose'),
  stringHelper = require('../utils/stringHelpers'),
  strings = require('../config/strings'),
  async = require('async'),
  crypto = require('crypto'),
  moment = require('moment'),
  Schema = mongoose.Schema,
  problemsModel = require('../models/challenges'),
  MailChimpAPI = require('mailchimp').MailChimpAPI,
  docHlpr = require('../utils/documentHelper');

var _saveDataUrl = docHlpr.saveDataUrl;
var _handleFileUpload = docHlpr.handleFileUpload;

var _redirectForError = function (req, res, err) {
  if (err) {
    logger.error(err);
  }
  if (req.user && req.use.roles.indexOf('admin')) {
    res.redirect('/admin/users');
  }
  else {
    res.redirect('/');
  }
};

var _getUser = function (req, res, username, display) {
  if (username) {
    accounts.findOne({username: username}, function (findErr, obj) {
      if (findErr) {
        _redirectForError(req, res, findErr);
      }
      organizations.find({}, function (orgErr, orgDocs) {
        obj.organizations = orgDocs;
        res.render(display, obj);
      });
    });
  }
  else {
    _redirectForError(req, res);
  }
};

var _getUserManageInformation = function (req, res, message, isCapabilityModalMsg, isChallengeModalMsg, isAlert, capabilityFormData, challengeFormData) {
  organizations.find({}, function (orgDocsErr, orgDocs) {
    problems.find({}, function (challengeDocsErr, allChallengeDocs) {
      organizations.findById(req.user.orgRef, function (organizationErr, orgDoc) {
        if (!orgDoc) {
          res.render('account/user-manage', {title: 'Manage Organization'});
        }
        else {
          capabilities.find({'orgRef': req.user.orgRef}, function (capabilityErr, capabilityDocs) {
            problems.find({'orgRef': req.user.orgRef}, function (challengeErr, challengeDocs) {
              accounts.find({'orgRef': req.user.orgRef}).lean().exec(function (err, users) {
                accounts.find({'orgRef': req.user.orgRef, 'approved': true}).lean().exec(function (err, approvedUsers) {
                  registration.find({'orgRef': req.user.orgRef}, function (regErr, regDocs) {
                    var updatedUsers = [];
                    var usersLength = users.length;

                    organizations.find({}, '_id orgName').lean().exec(function (err, orgs) {
                      for (var i = 0; i < usersLength; i++) {
                        users[i].lastNameSort = users[i].lastName.toLowerCase(); //users[i].lastNameNormalized;
                        date = new Date(users[i].dateAdded);
                        users[i].dateAdded = date.toUTCString();
                        updatedUsers.push(users[i]);
                      }

                      users = objectTools.sortByKey(users, 'lastNameSort');
                    });
                    var regChallengeIDs = [];
                    var regOrgDuns = [];
                    for (var reg in regDocs) {
                      if (req) {
                        regChallengeIDs.push(regDocs[reg].challengeID);
                        regOrgDuns.push(regDocs[reg].orgRef);
                      }
                    }
                    problems.find({'_id': {$in: regChallengeIDs}}, function (regOrgErrs, regChallenges) {
                      organizations.find({'_id': {$in: regOrgDuns}}, function (regOrgErrs, regOrgs) {
                        isDisplayable(orgDoc, function (canDisplay) {
                          communityModel.find({'owner': orgDoc.id},
                            function (communityErr, communityDoc) {
                              var renderObj = {
                                title: 'Manage Organization',
                                canDisplay: canDisplay,
                                organizationDocs: orgDocs,
                                challengeDocs: allChallengeDocs,
                                organization: orgDoc,
                                community: communityDoc,
                                products: capabilityDocs,
                                screenShots: orgDoc ? orgDoc.screenShots : [],
                                challenges: challengeDocs,
                                registrations: regDocs,
                                users: users,
                                approvedUsers: approvedUsers
                              };
                              if (message) {
                                renderObj.message = message;
                              }
                              if (isCapabilityModalMsg) {
                                renderObj.isCapabilityModalMsg = isCapabilityModalMsg;
                              }
                              if (isChallengeModalMsg) {
                                renderObj.isChallengeModalMsg = isChallengeModalMsg;
                              }
                              if (isAlert) {
                                renderObj.isAlert = isAlert;
                              }
                              if (capabilityFormData) {
                                renderObj.capabilityFormData = capabilityFormData;
                              }
                              if (challengeFormData) {
                                renderObj.challengeFormData = challengeFormData;
                              }
                              if (regChallenges) {
                                renderObj.regChallenges = regChallenges;
                              }
                              if (regOrgs) {
                                renderObj.regOrgs = regOrgs;
                              }
                              /*if (!canDisplay) {
                               renderObj.isAlert = true;
                               if (message) {
                               renderObj.message += strings.Organization.notDisplayAbleMessage;
                               }
                               else {
                               renderObj.message = strings.Organization.notDisplayAbleMessage;
                               }
                               }*/
                              res.render('account/user-manage', renderObj);
                            });
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
    });
  });
};
var _getOrgManageInformation = function (req, res, message, isCapabilityModalMsg, isChallengeModalMsg, isAlert, capabilityFormData, challengeFormData) {
  organizations.findById(req.user.orgRef, function (organizationErr, orgDoc) {
    if (!orgDoc) {
      res.render('account/org_profile', {title: 'Manage Organization'});
    }
    else {
      accounts.find({'orgRef': req.user.orgRef}).lean().exec(function (err, users) {
        accounts.find({'orgRef': req.user.orgRef, 'approved': true}).lean().exec(function (err, approvedUsers) {
          var updatedUsers = [];
          var usersLength = users.length;

          organizations.find({}, '_id orgName').lean().exec(function (err, orgs) {
            for (var i = 0; i < usersLength; i++) {
              users[i].lastNameSort = users[i].lastName.toLowerCase(); //users[i].lastNameNormalized;
              date = new Date(users[i].dateAdded);
              users[i].dateAdded = date.toUTCString();
              updatedUsers.push(users[i]);
            }

            users = objectTools.sortByKey(users, 'lastNameSort');
          });
          isDisplayable(orgDoc, function (canDisplay) {
            var renderObj = {
              title: 'Manage Organization',
              canDisplay: canDisplay,
              organization: orgDoc,
              users: users,
              approvedUsers: approvedUsers
            };
            if (message) {
              renderObj.message = message;
            }
            if (isAlert) {
              renderObj.isAlert = isAlert;
            }
            res.render('account/org_profile', renderObj);
          });
        });
      });
    }
  });
};

var _getUserContactInformation = function (username, callback) {
  if (typeof(callback) !== 'function') {
    return callback({error: 'The callback provided is not a function.'});
  } else if (!username) {
    return callback({error: 'A username must be provided.'});
  } else if (username) {
    accounts.findOne({username: username}).lean().exec(function (accountFindErr, accountDocs) {
      if (accountFindErr) {
        return callback({error: accountFindErr});
      } else if (!accountDocs) {
        return callback({error: 'User not found.'});
      } else if (accountDocs) {
        organizations.findById(accountDocs.orgRef, function (orgFindErr, orgDocs) {
          if (orgFindErr || !orgDocs) {
            return callback({error: !orgDocs ? orgFindErr : 'There was no organization associated with the account.'});
          } else if (orgDocs) {
            if (orgDocs.primaryPoc === 'Business') {
              return callback({}, accountDocs, {
                primaryPocFirstName: orgDocs.businessPocFirstName,
                primaryPocLastName: orgDocs.businessPocLastName, primaryPocEmail: orgDocs.businessPocEmail,
                primaryPocPhone: orgDocs.businessPocPhone, primaryPoc: orgDocs.primaryPoc
              });
            } else if (orgDocs.primaryPoc === 'Technical') {
              return callback({}, accountDocs, {
                primaryPocFirstName: orgDocs.technicalPocFirstName,
                primaryPocLastName: orgDocs.technicalPocLastName, primaryPocEmail: orgDocs.technicalPocEmail,
                primaryPocPhone: orgDocs.technicalPocPhone, primaryPoc: orgDocs.primaryPoc
              });
            }
          }
        });
      }
    });
  }
};

var accountController = {};

accountController.validateAccountDataFields = function (req, res, callback) {
  if (typeof(callback) !== 'function') {
    return;
  }
  var status_message = validate.validateUserDataFields(req);
  if (status_message !== true) {
    return callback({error: status_message});
  }
  return callback({});
};

accountController.createAccount = function (req, res, organization, callback) {
  if (typeof(callback) !== 'function') {
    return;
  }
  // Generate the user name as the first letter in the last name and the last name, all lower case
  var username = (req.body.firstName[0] + req.body.lastName).toLowerCase();

  var tempPassword = uuid.v1();
  accountsCreator(username, tempPassword, req.body.email, req.body.firstName, req.body.lastName, req.body.phoneNumber,
    organization._id, function (err) {
      if (err) {
        // Remove the organization because there was a failure in creating the account
        // If the organization already existed, this point won't be reached since a duplicate
        // organization won't have been permitted to be created.
        if (organization) {
          organization.remove();
        }
        return callback({error: "The user email address provided is already taken."});
      } else {
        var text = stringHelper.format(strings.Emails.newUser.text, (req.body.firstName + ' ' + req.body.lastName + '(' + username + ')'));
        emailer.sendEmail({
          from: cfg.helpDeskEmail,
          to: cfg.helpDeskEmail,
          subject: strings.Emails.newUser.subject,
          text: text,
          html: strings.Emails.newUser.html
        });
        return callback({});
      }
    });
};

accountController.doesEmailExist = function (req, res, callback) {
  if (typeof(callback) !== 'function') {
    return;
  } else if (!req.params.email) {
    callback({error: "An email address must be provided to query about a user from the database."});
    return;
  }

  var email = req.params.email;
  accounts.findOne({email: email}, function (err, account) {
    if (err) {
      callback({error: "Error: " + err});
    } else if (account) {
      callback({});
    } else if (!account) {
      callback({error: "There is no account with email " + email + " in the database."});
    }
  });
};
accountController.doesUsernameExist = function (req, res, callback) {
  if (typeof(callback) !== 'function') {
    return;
  } else if (!req.params.username) {
    callback({error: "An username must be provided to query about a user from the database."});
    return;
  }

  var username = req.params.username;
  accounts.findOne({username: username}, function (err, account) {
    if (err) {
      callback({error: "Error: " + err});
    } else if (account) {
      callback({});
    } else if (!account) {
      callback({error: "There is no account with username " + username + " in the database."});
    }
  });
};

accountController.read = {};
accountController.read.get = function (req, res) {
  _getUser(req, res, req.params.username, 'account/view');
};

accountController.update = {};
accountController.update.get = function (req, res) {
  _getUser(req, res, req.params.username, 'account/user-update');
};
accountController.update.post = function (req, res) {
  var username = req.params.username;
  if (username) {
    accounts.findOne({username: username}, function (findErr, obj) {
      if (findErr) {
        logger.error(findErr);
        return;
      }
      obj.firstName = req.body.firstName;
      obj.lastName = req.body.lastName;
      obj.phoneNumber = req.body.phoneNumber;
      obj.email = req.body.email;
      obj.save(function (saveErr) {
        if (saveErr) {
          logger.error(saveErr);
        }
        res.render('account/user-update', obj);
      });
    });
  }
  else {
    _redirectForError(req, res);
  }
};

accountController.forgotPassword = {
  get: function (req, res) {
    res.render('account/forgot_pass', {
      user: req.user
    });
  },
  post: function (req, res) {
    async.waterfall([
      function (done) {
        crypto.randomBytes(20, function (err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function (token, done) {
        accounts.findOne({email: req.body.email}, function (err, user) {
          if (!user) {
            return res.render('account/forgot_pass', {error: "We're sorry! No account with that email address exists."});
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function (err) {
            done(err, token, user);
          });
        });
      },
      function (token, user, done) {
        var resetUrl = 'http://' + req.headers.host + '/reset/' + token;
        var mailOptions = {
          to: user.email,
          from: cfg.helpDeskEmail,
          subject: res.locals.strings.Emails.userPasswordReset.subject,
          text: stringHelper.format(res.locals.strings.Emails.userPasswordReset.text, resetUrl)
        };
        emailer.sendEmail(mailOptions);
        done(null, {info: 'An e-mail has been sent to ' + user.email + ' with further instructions.'}, 'done');
      }
    ], function (err, message) {
      if (err) return next(err);
      res.render('account/forgot_pass', message);
    });
  }
};
accountController.resetPassword = {
  get: function (req, res) {
    if (req.user) {
      var user = {
        id: res.locals.userinfo.id
      };
      res.render('account/pass_reset', {user: user, currentRoute: 'user'});
    }
    else if (!req.user && req.params.token) {
      accounts.findOne({'resetPasswordToken': req.params.token}, function (err, userDoc) {
        if (err || !userDoc) {
          res.render('error', err);
        }
        else {
          res.render('account/pass_reset', {user: {id: userDoc.id}, currentRoute: 'user'});
        }
      });
    }
    else {
      res.redirect('/');
    }
  },
  post: function (req, res) {
    async.waterfall([
      function (done) {
        var userID = req.body.id;
        var newPass = req.body.newpass;
        var confirmPass = req.body.confirmpass;

        var passStatus = auth.checkNewAndConfirmPasswords(newPass, confirmPass);

        if (passStatus.error) {
          res.send({error: passStatus.error});
        } else {
          auth.updatePassword(userID, newPass, function (err, user) {
            if (err.error) {
              res.send({error: err.error});
            } else {
              req.logIn(user, function (err) {
                done(err, user);
              });
            }
          });
        }
      },
      function (err, user) {
        if (req.originalUrl.toLowerCase().indexOf('welcome') > -1 || req.originalUrl.toLowerCase().indexOf('profile') === -1) {
          res.send({redirectUrl: '/profile/' + user.username + '/manage'});
        } else {
          res.send({});
        }
      }
    ]);

  }
};
accountController.reactivateAccount = {
  get: function (req, res) {
    if (req.params.email) {
      accounts.findOne({'email': req.params.email}, function (err, userDoc) {
        if (err || !userDoc) {
          res.render('account/reactivate-account', {status: 'failed'});
        }
        else {
          if (userDoc.approved && req.user && req.user.email == req.params.email) {
            res.redirect('/');
          } else if (userDoc.approved) {
            res.render('account/reactivate-account', {status: 'successful', message: 'alreadyApproved'});
          } else {
            userDoc.approved = true;
            userDoc.save(function(err, userDoc) {
              if (err) {
                res.render('account/reactivate-account', {status: 'failed'});
              } else {
                organizations.findOne({'_id': userDoc.orgRef}, function(err, orgDoc){
                  if (err) {
                    res.render('account/reactivate-account', {status: 'failed'});
                  } else {
                    orgDoc.approved = true;
                    communitiesInsertOrganizationIntoGsm(orgDoc);
                    orgDoc.save(function(err){
                      if (err) {
                        res.render('account/reactivate-account', {status: 'failed'});
                      } else {
                          var mcReq = {
                              id: cfg.mailchimp.listID,
                              email: { email: userDoc.email },
                              merge_vars: {
                                  EMAIL: userDoc.email,
                                  FNAME: userDoc.firstName,
                                  LNAME: userDoc.lastName,
								  MMERGE3: orgDoc.orgName
                              },
                              double_optin: false
                          };

                          try {
                              var api = new MailChimpAPI(cfg.mailchimp.apiKey, { version: '2.0' });
                          } catch (error) {
                              console.log(error.message);
                          }
                          api.call('lists', 'subscribe', mcReq, function (error, data) {
                              if (error)
                                  console.log(error.message);
                              else
                                  console.log(JSON.stringify(data)); // Log data of subscription
                          });
                        res.render('account/reactivate-account', {status: 'successful', message: 'successful'});
                      }
                    });

                  }
                });
              }
            });
          }
        }
      });
    }
    else {
      res.redirect('/');
    }
  }
};

accountController.manage = {};
accountController.manage.orgAdmin = function (req, res) {
  accounts.findById(req.body.id, function (err, obj) {
    accounts.findById(req.body.id, function (err, doc) {
      if (obj) {
        doc.roles = [];

        if (obj.roles[0] == 'admin' || obj.roles[0] == 'user') {
          doc.roles.push(obj.roles[0]);
        }
        if (obj.roles[1] == 'admin' || obj.roles[1] == 'user') {
          doc.roles.push(obj.roles[1]);
        }

        if (req.body.orgManager == 'true') {

          doc.roles.push(accountRoles.OrgManager);
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
};
accountController.manage.get = function (req, res) {
  _getUserManageInformation(req, res);
};
accountController.manage.post = function (req, res) {

  orgController.updateOrganization(req, res, false, function (saveErr) {
    var message = "Your organization profile has been updated successfully.";
    var isAlert = false;
    if (saveErr) {
      message = saveErr.message;
      isAlert = true;
    }
    _getUserManageInformation(req, res, message, false, false, isAlert);
  });
};

accountController.manage.capabilityCreate = {};
accountController.manage.capabilityCreate.get = function (req, res) {
  res.redirect('/profile/' + req.user.username + '/manage');
};
accountController.manage.capabilityCreate.post = function (req, res) {
  if (!req.body.certify) {
    _getUserManageInformation(req, res, 'Please click certify your capability is the proper TRL level.', true, true, req.body);
  }
  else {
    var logoFile = undefined;
    if (req.files && req.files.showcaseImage) {
      logoFile = req.files.showcaseImage;
    }
    var categories = [];
    if (req.body.analytics) {
      categories.push('analytics');
    }
    if (req.body.collaboration) {
      categories.push('collaboration');
    }
    if (req.body.cyberSecurity) {
      categories.push('cyberSecurtiy');
    }
    if (req.body.gis) {
      categories.push('gis');
    }
    if (req.body.imageProcessing) {
      categories.push('imageProcessing');
    }
    if (req.body.infrastructure) {
      categories.push('infrastructure');
    }
    if (req.body.modeling) {
      categories.push('modeling');
    }
    if (req.body.remoteSensing) {
      categories.push('remoteSensing');
    }
    if (req.body.search) {
      categories.push('search');
    }
    if (req.body.visualization) {
      categories.push('visualization');
    }
    if (req.body.otherCategory && typeof req.body.otherCategory === 'string') {
      categories.push(req.body.otherCategory);
    }

    capabilityCreator(false, req.body.capabilityName, req.user.orgRef, req.body.pocName, req.body.pocEmail,
      req.body.capabilityDescription, categories, req.body.webLink, logoFile,
      function (err) {
        var message = cfg.capabilitySubmitResponse;
        var isAlert = false;
        var formData = undefined;
        if (err) {
          logger.error(err);
          message = err.message;
          isAlert = true;
          formData = req.body;
        }
        _getUserManageInformation(req, res, message, true, false, isAlert, formData);
      }
    );
  }
};

accountController.manage.challengeCreate = {};
accountController.manage.challengeCreate.get = function (req, res) {
  res.redirect('/profile/' + req.user.username + '/manage');
};
accountController.manage.challengeCreate.post = function (req, res) {
  organizations.findOne({'_id': req.user.orgRef, orgRole: /Client|Both/i}, function (orgErr, orgDoc) {
    if (orgErr || !orgDoc) {
      logger.error(err);
      var message = 'You do not have the permissions to perform this action';
      var isAlert = true;
      var formData = req.body;
      _getUserManageInformation(req, res, message, false, true, isAlert, undefined, formData);
    }
    else {
      var newProblem = new problems();
      newProblem.orgRef = req.user.orgRef;
      newProblem.name = req.body.name;
      newProblem.pocName = req.body.pocName;
      newProblem.pocEmail = req.body.pocEmail;
      newProblem.description = req.body.description;
      newProblem.startDate = req.body.startDate;
      newProblem.endDate = req.body.endDate;
      newProblem.requirementDescription = req.body.requirements;

      if (req.file.documents) {
        var documents = req.file.documents;
        if (documents.constructor === Array) {
          for (var i = 0; i < documents.length; i++) {
            var docObj = {
              name: documents[i].originalname,
              mimeType: documents[i].mimetype,
              path: cfg.problemDocURL + '/' + documents[i].name
            };
            newProblem.documents.push(docObj);
          }
        }
        else if (typeof documents === 'object') {
          var docObj = {
            name: documents.originalname,
            mimeType: documents.mimetype,
            path: cfg.problemDocURL + '/' + documents.name
          };
          newProblem.documents.push(docObj);
        }
      }
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
          _getUserManageInformation(req, res, message, false, true, isAlert, undefined, formData);
        }
      );
    }
  });
};

accountController.removeImage = {};
accountController.removeImage.post = function (req, res) {
  //TODO : This should be moved to an API call
  orgRemoveImage(req.body.imageName, req.body.orgRef, function (data) {
    res.send(data);
  });
};

accountController.addImage = {};
accountController.addImage.post = function (req, res) {
  //TODO : This should be moved to an API call
  orgAddImage(req.body.orgRef, req.files, function (data) {
    res.status(data.status)
      .send(data.results)
      .end();
  });
};

accountController.organizationManage = {};
accountController.organizationManage.get = function (req, res, message) {
    _getOrgManageInformation(req, res);
};
accountController.organizationManage.post = function (req, res) {
  orgController.updateOrganization(req, res, false, function (saveErr) {
    var message = "Your organization profile has been updated successfully.";
    var isAlert = false;
    if (saveErr) {
      message = saveErr.message;
      isAlert = true;
    }
    _getOrgManageInformation(req, res, message, false, false, isAlert);
  });
};

accountController.organizationUsers = {};
accountController.organizationUsers.get = function (req, res, message) {
  accounts.find({'orgRef': req.user.orgRef}).lean().exec(function (err, users) {
    accounts.find({'orgRef': req.user.orgRef, 'approved': true}).lean().exec(function (err, approvedUsers) {
      var updatedUsers = [];
      var usersLength = users.length;
      organizations.find({}, '_id orgName').lean().exec(function (err, orgs) {
        for (var i = 0; i < usersLength; i++) {
          users[i].lastNameSort = users[i].lastName.toLowerCase(); //users[i].lastNameNormalized;
          date = new Date(users[i].dateAdded);
          users[i].dateAdded = date.toUTCString();
          updatedUsers.push(users[i]);
        }

        users = objectTools.sortByKey(users, 'lastNameSort');
      });
      var renderObj = {
        title: 'Manage Users',
        users: users,
        approvedUsers: approvedUsers
      };

      res.render('account/org_users', renderObj);
    });
  });
};
accountController.organizationUsers.post = function (req, res) {
    orgController.updateOrganization(req, res, false, function (saveErr) {
        var message = "Your organization profile has been updated successfully.";
        var isAlert = false;
        if (saveErr) {
            message = saveErr.message;
            isAlert = true;
        }
        _getOrgManageInformation(req, res, message, false, false, isAlert);
    });
};

accountController.organizationCapabilities = {};
accountController.organizationCapabilities.get = function (req, res, message) {
    capabilities.find({ 'orgRef': req.user.orgRef }, function (capabilityErr, capabilityDocs) {
        var renderObj = {
            products: capabilityDocs
        };
        res.render('account/org-capabilities', renderObj);
    });

};
accountController.organizationFiles = {};
accountController.organizationFiles.get = function (req, res, message) {
    organizations.findById(req.user.orgRef, function (organizationErr, orgDoc) {
        var renderObj = {
            screenShots: orgDoc ? orgDoc.screenShots : []
        };

        res.render('account/org-files', renderObj);

    });
};
accountController.userProfile = {};
accountController.userProfile.get = function (req, res, message) {
    organizations.findById(req.user.orgRef, function (organizationErr, orgDoc) {
        var renderObj = {
            organization: orgDoc

        };

        res.render('account/user-profile', renderObj);

    });
};
accountController.userProfile.post = function (req, res) {
    var username = req.body.username;
    if (username) {
        accounts.findOne({ username: username }, function (findErr, obj) {
            if (findErr) {
                logger.error(findErr);
                return;
            }
            obj.firstName = req.body.firstName;
            obj.lastName = req.body.lastName;
            obj.email = req.body.email;
            obj.save(function (saveErr) {
                if (saveErr) {
                    logger.error(saveErr);
                    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: '' });
                }
                
           
              res.status(httpStatus.ACCEPTED).json({message: 'Organization is marked approved'});
            });
        });
    }
    else {
        _redirectForError(req, res);
    }
};
accountController.solutionSubmission = {};
accountController.solutionSubmission.get = function (req, res, message) {
    organizations.find({}, function (orgDocsErr, orgDocs) {
        problems.find({}, function (challengeDocsErr, allChallengeDocs) {
            
                    capabilities.find({ 'orgRef': req.user.orgRef }, function (capabilityErr, capabilityDocs) {
                        problems.find({ 'orgRef': req.user.orgRef }, function (challengeErr, challengeDocs) {
                            var offset = 0;
                            
                            registration.find({ 'orgRef': req.user.orgRef}, {}, {limit: 10}, function (regErr, regDocs) {
                                        communityModel.find({},
                                         function (communityErr, communityDoc) {
                                             var regChallengeIDs = [];
                                             var regOrgDuns = [];
                                             for (var reg in regDocs) {
                                                 if (req) {
                                                     regChallengeIDs.push(regDocs[reg].challengeID);
                                                     regOrgDuns.push(regDocs[reg].orgRef);
                                                 }
                                             }

                                             var count = offset - 10;
                                             
                                             count = count + regDocs.length;
                                             
                                             var viewMoreCheck = "";
                                             if (regDocs.length == 10) {
                                                 viewMoreCheck = "argh";
                                                 
                                             }
                                             if (count < offset) {
                                                 offset = 0;
                                             }

                                             var renderObj = {
                                                 organizationDocs: orgDocs,
                                                 challengeDocs: allChallengeDocs,
                                                 challenges: challengeDocs,
                                                 communities: communityDoc,                                                 
                                                 registrations: regDocs,
                                                 count: offset,
                                                 viewMore: viewMoreCheck
                                             };
                                            
                                                 res.render('account/org_solutions', renderObj);
                                             



                                         });
                                });
                            
                        });
                    });
                
            
        });
    });
};
accountController.viewMoreSubmissions = {};
accountController.viewMoreSubmissions.get = function (req, res, message) {
    organizations.find({}, function (orgDocsErr, orgDocs) {
        problems.find({}, function (challengeDocsErr, allChallengeDocs) {

            capabilities.find({ 'orgRef': req.user.orgRef }, function (capabilityErr, capabilityDocs) {
                problems.find({ 'orgRef': req.user.orgRef }, function (challengeErr, challengeDocs) {
                    var offset = 0;
                    if (req.params.offset) {

                        offset = parseInt(req.params.offset) + 10;
                    }
                    
                    registration.find({ 'orgRef': req.user.orgRef }, {}, { skip: offset, limit: 10 }, function (regErr, regDocs) {
                        communityModel.find({},
                         function (communityErr, communityDoc) {
                             var regChallengeIDs = [];
                             var regOrgDuns = [];
                             for (var reg in regDocs) {
                                 if (req) {
                                     regChallengeIDs.push(regDocs[reg].challengeID);
                                     regOrgDuns.push(regDocs[reg].orgRef);
                                 }
                             }
                             var count = offset - 10;

                             count = count + regDocs.length;

                             if (count < offset) {
                                 offset = 0;
                             }
                             
                             var orgRef = "";
                             var newRegDocs = [];

                             var obj = {
                                 regDocs: regDocs,
                                 orgDocs: orgDocs,
                                 allChallengeDocs: allChallengeDocs,
                                 communityDoc: communityDoc,
                                 count: offset
                             };
                             
                             
                             
                                 res.send(obj);



                         });
                    });

                });
            });


        });
    });
};
accountController.communityMemberships = {
  get: function (req, res) {
    communityModel.find({approved: true}, function (communityFindErr, communityDocs) {
      if (communityFindErr) {
        logger.error(communityFindErr);
      }
      else {
        var orgRefs = [];
        for (var idx in communityDocs) {
          orgRefs.push(communityDocs[idx].owner.toString());
        }
        organizations.find({_id: {$in: orgRefs}}, function (orgErr, orgDocs) {
          getCommunityMetrics(communityDocs, function (err, calls) {
            async.parallel(calls, function (err, result) {
              res.render('account/community-membership', {
                title: 'Community Membership',
                communities: communityDocs,
                organizations: orgDocs || []
              });
            });
          });
        });
      }
    });
  },
  post: function (req, res) {

  }
};

accountController.communityAccess = {
  get: function (req, res) {
    res.render('account/community-access', {
      title: 'Community Access'
    });
  },
  post: function (req, res) {

  }
};

accountController.communityManageNews = {
  get: function (req, res) {
    var query = [ 
      {
        "$match": {approved: true}
      },
      {
        "$match": {$or: [{members: res.locals.userinfo.orgRef}, {owner: res.locals.userinfo.orgRef}]}
      },
      {
        "$unwind": "$news"
      }
    ];
    communityModel.aggregate(query, function(aggregateFindErr, communitiesAndNewsDocs) {
      if (aggregateFindErr) {
        logger.error(aggregateFindErr);
      }
      else {
        var query = [
          {
            "$match": {approved: true}
          },
          {
            "$match": {$or: [{members: res.locals.userinfo.orgRef}, {owner: res.locals.userinfo.orgRef}]}
          }
        ];
        communityModel.aggregate(query, function (aggregateFindErr2, communities) {
          if (aggregateFindErr2) {
            logger.error(aggregateFindErr2);
          }
          res.render('account/manage-news', {
            title: 'Manage News',
            communities: communities,
            communitiesAndNews: communitiesAndNewsDocs
          });
        })
      }
    });
  },
  post: function (req, res) {

  }
};

accountController.communityProblems = {
  get: function (req, res) {
    // Formulate MongoDB query
    var query = [
      // Find all of the problems and do the filtering client side 
      {
        $match: {}
      },
      // Join the owning organizations so their information can be displayed
      {
        $lookup: {
          "from": "organizations",
          "localField": "orgRef",
          "foreignField": "_id",
          "as": "org"
        }
      }
    ];

    problems.aggregate(query, function (aggregateErr, problemDocs) {
      if (aggregateErr) {
        logger.error(aggergateErr);
      }
      else if (problemDocs.length > 0) {
        for (var idx in problemDocs) {
          if (!problemDocs[idx].org[0]) {
            problemDocs[idx].org = [];
            problemDocs[idx].org[0] = 'Organization is no longer part of GSM.';
          }
        }

        // Find all of the approved communities and just return them for simplicity
        var query = [
          {
            $match: {approved: true}
          }
        ];
        communityModel.aggregate(query, function (aggregateErr2, communityDocs) {
          if (aggregateErr2) {
            logger.error(aggregateErr2);
          }
          else {
            // Find all approved communities the user's organization is a member of
            var query = [
              {
                $match: {approved: true}
              },
              {
                $match: {
                  members: {$in: [res.locals.userinfo.orgRef]}
                }
              }
            ];
            communityModel.aggregate(query, function (aggregateErr3, myCommunityDocs) {
              if (aggregateErr3) {
                logger.error(aggregateErr3);
              }
              else {
                res.render('account/community-problems', {
                  title: 'Community Problems',
                  problems: problemDocs,
                  communities: communityDocs,
                  myCommunities: myCommunityDocs
                });
              }
            });
          }
        });
      }
    });
  },
  post: function (req, res) {
    
  }
};

accountController.myProblems = {
  get: function (req, res) {
    // Formulate MongoDB query
    var query = [
      // Find all of the problems the user's organization has submitted
      {
        $match: {orgRef: res.locals.userinfo.orgRef}
      },
      // Join the user's organization so their information can be displayed
      {
        $lookup: {
          "from": "organizations",
          "localField": "orgRef",
          "foreignField": "_id",
          "as": "org"
        }
      }
    ];

    problems.aggregate(query, function (aggregateErr, problemDocs) {
      if (aggregateErr) {
        logger.error(aggergateErr);
      }
      else if (problemDocs.length > 0) {
        for (var idx in problemDocs) {
          if (!problemDocs[idx].org[0]) {
            problemDocs[idx].org = [];
            problemDocs[idx].org[0] = 'Organization is no longer part of GSM.';
          }
        }
        
        // Find all approved communities the user's organization is a member of
        var query = [
          {
            $match: {approved: true}
          },
          {
            $match: {
              members: {$in: [res.locals.userinfo.orgRef]}
            }
          }
        ];
        communityModel.aggregate(query, function (aggregateErr2, communityDocs) {
          if (aggregateErr2) {
            logger.error(aggregateErr2);
          }
          else {
            accounts.find({orgRef: res.locals.userinfo.orgRef, approved: true}, function(orgUsersError, orgUsers) {
              if (orgUsersError) { 
                logger.error(orgUsersError);
              }
              else {
                res.render('account/my-problems', {
                  title: 'My Problems',
                  problems: problemDocs,
                  communities: communityDocs,
                  organizationUsers: orgUsers
                });
              }
            });
          }
        });
      }
    });
  },
  post: function (req, res) {
    if (!req.body.communityID) {
      res.status(httpStatus.BAD_REQUEST)
        .json({message: 'Please provide a community ID.'});
    }
    else {
      var allowedRoles = [organizationRoles.both, organizationRoles.communityOwner, organizationRoles.client];
      if (allowedRoles.indexOf(res.locals.userinfo.orgRole) <= -1) {
        res.status(httpStatus.BAD_REQUEST)
          .json({message: strings.Problems.NotAExplorerProblem});
      }
      else {
        communityModel.findOne({_id: req.body.communityID}, function (err, communityDoc) {
          var newProblem = new problems();
          newProblem.orgRef = req.user.orgRef;
          newProblem.name = req.body.name;
          newProblem.pocName = req.body.pocName;
          newProblem.pocEmail = req.body.pocEmail;
          newProblem.description = req.body.description;
          newProblem.startDate = req.body.startDate;
          newProblem.endDate = req.body.endDate;
          newProblem.requirementDescription = req.body.requirements;
          newProblem.isDraft = req.body.isDraft;

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
            var mimeType = req.body.thumbnail.match(/(image\/.*);/)[1];
            var extension = req.body.thumbnail.match(/image\/(.*);/)[1];
            if (cfg.validUploadMimeTypes.indexOf(mimeType) > -1) {
              var name = 'discovery_thumbnail_' + newProblem.name + '.' + extension;
              var path = '/images/' + name;
              newProblem.thumbnail = {name: name, mimetype: mimeType, path: path, date_created: new Date()};
              _saveDataUrl(cfg.imageUploadDir + '/discovery_thumbnail_' + newProblem.name, req.body.thumbnail);
            }
          }

          var des = [];
          var dms = [];
          if(req.body.discoveryEvaluators) {
            des = req.body.discoveryEvaluators.split(', ');
          }
          if(req.body.discoveryManagers) {
            dms = req.body.discoveryManagers.split(', ');
          }
          accounts.find({_id: {$in: dms}}, function(dmUserError, dmUsers) {
            accounts.find({_id: {$in: des}}, function(deUserError, deUsers) {

              if(dmUserError) {
                res.status(httpStatus.INTERNAL_SERVER_ERROR)
                  .json({message: dmUserError.message});
              }
              else if(deUserError) {
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
                problemCreator(newProblem, function (err, newProblem) {
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
        });
      }
    }
  },
  put: function (req, res) {

  },
  delete: function (req, res) {
    var id = req.body.id;
    problems.findOneAndRemove({'_id': id}, function (err, doc) {
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
          res.json({error: 'There was an error deleting this problem.'});
        }
        else if (!doc) {
          res.json({message: 'No Problem matches the given ID.'});
        }
        else {
          // This has to be require() here in order to avoid circular dependency issues.
          var registrations = require('../models/registrations').Registration;
          registrations.find({'challengeID': doc._id}).remove(function (err, regDocs) {
            if (err) {
              logger.error(err);
              res.json({error: 'There was an error deleting the solution submissions for this problem.'});
            }
            else {
              res.json({message: 'Problem deleted successfully.'});
            }
          });
        }
      });
    });
  }
};

accountController.newsfeed = {
  get: function (req, res) {
    var renderObj = {};
    var userOrgRef = res.locals.userinfo.orgRef;
    res.render('account/newsfeed', renderObj);
  },
  post: function (req, res) {

  }
};

accountController.newsfeed.organizations = {
  get: function (req, res) {
    var dateStart = new Date(req.params.startDate);
    dateStart.setSeconds(0);
    dateStart.setHours(0);
    dateStart.setMinutes(0);

    var dateEnd = new Date(dateStart);
    dateEnd.setHours(23);
    dateEnd.setMinutes(59);
    dateEnd.setSeconds(59);

    var newsfeedHtml = '';

    var query = [
      {
        $match: {
          $and: [{"urlFriendlyID": res.locals.geoIntCommunityUrlFriendlyId}, {approved: true}]
        }
      },
      {
        $unwind: '$members'
      },
      {
        $lookup: {
          "from": "organizations",
          "localField": "members",
          "foreignField": "_id",
          "as": "org"
        }
      },
      {
        $match: {
          "org.dateCreated": {
            $gte: dateStart,
            $lte: dateEnd
          }
        }
      }
    ];
    communityModel.aggregate(
      query, function (aggregateErr, communityDocs) {

        if (aggregateErr) {
          logger.error(aggregateErr);
          res.status(httpStatus.OK).json({
            newsfeedHtml: newsfeedHtml
          });
        }
        else if (communityDocs.length < 1) {
          res.status(httpStatus.OK).json({
            newsfeedHtml: newsfeedHtml
          });
        }
        else {
          // Get the organization for the current user to determine whether the Start a Conversation
          // button should appear in the activity feed
          organizations.findOne({'_id': res.locals.userinfo.orgRef}, function (findOrgErr, orgDoc) {
            if (findOrgErr) {
              logger.error(findOrgErr);
              res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                newsfeedHtml: newsfeedHtml
              });
            }
            else if (!orgDoc) {
              res.status(httpStatus.OK).json({
                newsfeedHtml: newsfeedHtml
              });
            } 
            else {
              for (var idx in communityDocs) {
                var params = {
                  date: req.params.startDate,
                  organization: communityDocs[idx].org[0],
                  idx: idx
                };
                newsfeedHtml = addNewOrganizationsHtml(newsfeedHtml, params, orgDoc.orgRole);
              }
              res.status(httpStatus.OK).json({
                newsfeedHtml: newsfeedHtml
              });
            }
          });
        }
      }
    );
  }
};

accountController.newsfeed.capabilities = {
  get: function (req, res) {

    var dateStart = new Date(req.params.startDate);
    dateStart.setUTCSeconds(0);
    dateStart.setUTCHours(0);
    dateStart.setUTCMinutes(0);
    dateStart.setUTCMilliseconds(0);

    var dateEnd = new Date(dateStart);
    dateEnd.setUTCHours(23);
    dateEnd.setUTCMinutes(59);
    dateEnd.setUTCSeconds(59);
    dateEnd.setUTCMilliseconds(999);

    var newsfeedHtml = '';

    var query =
    {
      $and: [{"urlFriendlyID": res.locals.geoIntCommunityUrlFriendlyId}, {approved: true}]
    };

    communityModel.findOne(query, function (aggregateErr, communityDoc) {
      if (aggregateErr) {
        logger.error(aggregateErr);
        res.status(httpStatus.OK).json({
          newsfeedHtml: newsfeedHtml
        });
      }
      else if (!communityDoc) {
        res.status(httpStatus.OK).json({
          newsfeedHtml: newsfeedHtml
        });
      }
      else {
        // Get the organization for the current user to determine whether the Start a Conversation
        // button should appear in the activity feed
        organizations.findOne({'_id': res.locals.userinfo.orgRef}, function (findOrgErr, orgDoc) {
          if (findOrgErr) {
            logger.error(findOrgErr);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
              newsfeedHtml: newsfeedHtml
            });
          }
          else if (!orgDoc) {
            res.status(httpStatus.OK).json({
              newsfeedHtml: newsfeedHtml
            });
          }
          else {
            var query = [
              // Find all of the capabilities of the given community
              {
                $match: {
                  $and: [{"_id": {$in: communityDoc.solutions}}, {approved: true}]
                }
              },
              // Find the capability that was added on the given date
              {
                $match: {
                  "date_created": {
                    $gte: dateStart,
                    $lte: dateEnd
                  }
                }
              },
              // Join the owning organizations so their information can be displayed
              {
                $lookup: {
                  "from": "organizations",
                  "localField": "orgRef",
                  "foreignField": "_id",
                  "as": "org"
                }
              }
            ];
            capabilities.aggregate(query, function (aggregateErr, capabilityDocs) {
              if (aggregateErr) {
                logger.error(aggregateErr);
              }
              else if (capabilityDocs.length > 0) {
                for (var idx in capabilityDocs) {
                  var org = {};
                  if (!capabilityDocs[idx].org[0]) {
                    org.orgName = 'Organization is no longer part of GSM.';
                  }
                  else {
                    org = capabilityDocs[idx].org[0];
                  }
                  var params = {
                    date: req.params.startDate,
                    capability: capabilityDocs[idx],
                    organization: org,
                    idx: idx
                  };
                  newsfeedHtml = addNewCapabilitiesHtml(newsfeedHtml, params, orgDoc.orgRole);
                }
              }
              res.status(httpStatus.OK).json({
                newsfeedHtml: newsfeedHtml
              });
            });
          }
        });
      }
    });
  }
};

accountController.newsfeed.problems = {
  get: function (req, res) {

    var dateStart = new Date(req.params.startDate);
    dateStart.setUTCSeconds(0);
    dateStart.setUTCHours(0);
    dateStart.setUTCMinutes(0);
    dateStart.setUTCMilliseconds(0);

    var dateEnd = new Date(dateStart);
    dateEnd.setUTCHours(23);
    dateEnd.setUTCMinutes(59);
    dateEnd.setUTCSeconds(59);
    dateEnd.setUTCMilliseconds(999);

    var newsfeedHtml = '';

    var query =
    {
      $and: [{"urlFriendlyID": res.locals.geoIntCommunityUrlFriendlyId}, {approved: true}]
    };
    communityModel.findOne(query, function (aggregateErr, communityDoc) {
      if (aggregateErr) {
        logger.error(aggregateErr);
        res.status(httpStatus.OK).json({
          newsfeedHtml: newsfeedHtml
        });
      }
      else if (!communityDoc) {
        res.status(httpStatus.OK).json({
          newsfeedHtml: newsfeedHtml
        });
      }
      else {
        var query = [
          // Find all of the problems of the given community
          {
            $match: {
              $and: [{"_id": {$in: communityDoc.discoveries}}, {approved: true}]
            }
          },
          // Find the problems added on the given date
          {
            $match: {
              "date_created": {
                $gte: dateStart,
                $lte: dateEnd
              }
            }
          },
          // Join the owning organizations so their information can be displayed
          {
            $lookup: {
              "from": "organizations",
              "localField": "orgRef",
              "foreignField": "_id",
              "as": "org"
            }
          }
        ];
        problems.aggregate(query, function (aggregateErr, problemDocs) {
          if (aggregateErr) {
            logger.error(aggregateErr);
          }
          else if (problemDocs.length > 0) {
            for (var idx in problemDocs) {
              var org = {};
              if (!problemDocs[idx].org[0]) {
                org.orgName = 'Organization is no longer part of GSM.';
              }
              else {
                org = problemDocs[idx].org[0];
              }
              var params = {
                date: req.params.startDate,
                problem: problemDocs[idx],
                organization: org,
                idx: idx
              };
              newsfeedHtml = addNewProblemsHtml(newsfeedHtml, params);
            }
          }
          res.status(httpStatus.OK).json({
            newsfeedHtml: newsfeedHtml
          });
        });
      }
    });
  }
};

accountController.newsfeed.news = {
  get: function (req, res) {

    var dateStart = new Date(req.params.startDate);
    dateStart.setUTCSeconds(0);
    dateStart.setUTCHours(0);
    dateStart.setUTCMinutes(0);
    dateStart.setUTCMilliseconds(0);

    var dateEnd = new Date(dateStart);
    dateEnd.setUTCHours(23);
    dateEnd.setUTCMinutes(59);
    dateEnd.setUTCSeconds(59);
    dateEnd.setUTCMilliseconds(999);

    var newsfeedHtml = '';

    var query = [
      {
          $match: {
            $and: [{"urlFriendlyID": res.locals.geoIntCommunityUrlFriendlyId}, {approved: true}]
          }
      },
      {
        "$unwind": "$news"
      },
      {
        "$match": {
          $and: [
            {
              "news.releaseDate": {
                $gte: dateStart,
                $lte: dateEnd
              }
            },
            {
              "news.editedOn": {
                $gte: dateStart,
                $lte: dateEnd
              }
            }
          ]
        }
      },
      // Join the user so the organization can then be referenced and displayed
      {
        $lookup: {
          "from": "accounts",
          "localField": "news.publishedBy",
          "foreignField": "email",
          "as": "user"
        }
      }
    ];

    communityModel.aggregate(query, function (aggregateErr, communityAndNewsDocs) {
      if (aggregateErr) {
        logger.error(aggregateErr);
      }
      else if (communityAndNewsDocs.length > 0) {
        // Get the organization for the current user to determine whether the Start a Conversation
        // button should appear in the activity feed
        organizations.findOne({'_id': res.locals.userinfo.orgRef}, function (findOrgErr, orgDoc) {
          if (findOrgErr) {
            logger.error(findOrgErr);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
              newsfeedHtml: newsfeedHtml
            });
          }
          else if (!orgDoc) {
            res.status(httpStatus.OK).json({
              newsfeedHtml: newsfeedHtml
            });
          }
          else {
            organizations.find({}, function (err, organizationDocs) {
              for (var idx in communityAndNewsDocs) {
                for (var idx2 in organizationDocs) {
                  if (communityAndNewsDocs[idx].user[0]) {
                    if (communityAndNewsDocs[idx].user[0].orgRef.toString() === organizationDocs[idx2]._id.toString()) {
                      var params = {
                        date: req.params.startDate,
                        community: communityAndNewsDocs[idx],
                        news: communityAndNewsDocs[idx].news,
                        organization: organizationDocs[idx2],
                        idx: idx
                      };
                      newsfeedHtml = addNewNewsHtml(newsfeedHtml, params, orgDoc.orgRole);
                    }
                  }
                }
              }
              res.status(httpStatus.OK).json({
                newsfeedHtml: newsfeedHtml
              });
            });
          }
        });
      }
      else {
        res.status(httpStatus.OK).json({
          newsfeedHtml: newsfeedHtml
        });
      }
    });
  }
};

var addNewOrganizationsHtml = function (newsfeedHtml, params, userOrgRole) {
  var MAX_DESCRIPTION_CHARS = 120;
  if (!params.organization.logoUrl) {
    params.organization.logoUrl = strings.PublicStaticContentDirectoryFullPrefixPath + "/images/logo-default.png"
  }
  if (!params.organization.tagline) {
    params.organization.tagline = '';
  }
  var splitMarketAreas = [];
  if (typeof(params.organization.marketArea) != 'undefined') {
    splitMarketAreas = params.organization.marketArea.split(',');
  }
  splitMarketAreas.forEach(function(val, idx) {
    splitMarketAreas[idx] = val.trim();
  });
  var userOrgDescription = "";
  if (typeof(params.organization.description) != 'undefined') {
    userOrgDescription = params.organization.description;
    // Get rid of the html formatting for this view
    userOrgDescription = userOrgDescription.replace(/<(?:.|\n)*?>/gm, '');
  }
  if (userOrgDescription.length > MAX_DESCRIPTION_CHARS) {
    userOrgDescription = userOrgDescription.slice(0, MAX_DESCRIPTION_CHARS) + '...';
  }
  newsfeedHtml +=
    '<li id="org-' + params.date + '-' + params.idx + '" class="hover organization"><div class="hover-text bg-purple hidden-xs">Member</div>' +
    '<i class="fa fa-institution purple"></i>' +
    '<div class="timeline-item">' +
    '<span class="time"><span class="label bg-purple">Member</span></span>' +
    '<a href="' + cfg.externalHostname + '/organization/' + params.organization.urlFriendlyID + '">' +
    '<div class="crop-wrapper">' +
    '<div class="crop"><img src="' + params.organization.logoUrl + '" alt="' + params.organization.orgName + '" class="timeline-thumb"></div>' +
    '</div>' +
    '</a>' +
    '<h3 class="timeline-header no-border"><a href="' + cfg.externalHostname + '/organization/' + params.organization.urlFriendlyID + '">' + params.organization.orgName + '</a><i>' + params.organization.tagline + '</i></h3>' +
    '<div class="actions">';
    if (splitMarketAreas.length > 1) {
      newsfeedHtml += '<p class="labels timeline-items" style="margin-left: 0px;">Market Areas: ';
    }
    else if (splitMarketAreas.length == 1) {
      newsfeedHtml += '<p class="labels" style="margin-left: 0px;">Market Area: ';
    }
    for (var idx in splitMarketAreas) {
      newsfeedHtml += 
        '<span class="label jivango-category-bkgd" style="margin-right: 3px; margin-bottom: 5px;">' +
          splitMarketAreas[idx] +
        '</span>';
    }
    newsfeedHtml += '</p>'; 
    if (userOrgDescription.length > 0) {
      newsfeedHtml += '<p class="labels timeline-items" style="margin-left: 0px;">Description: ' + userOrgDescription + '</p>'; 
    }
    userOrgRole = userOrgRole.toLowerCase();
    if (userOrgRole.indexOf(organizationRoles.client) > -1 || userOrgRole.indexOf(organizationRoles.both) > -1 ||
        userOrgRole.indexOf(organizationRoles.communityOwner) > -1) {
      newsfeedHtml +=
        '<a class="btn btn-primary btn-xs" href="' + cfg.externalHostname + '/conversations"><i class="fa fa-comment"></i> Start a Conversation</a> '; 
    }
    newsfeedHtml +=
    '<a class="btn btn-info btn-xs" href="' + cfg.externalHostname + '/organization/' + params.organization.urlFriendlyID + '"><i class="fa fa-eye"></i> View</a>' +
    '</div>' +
    '</div></li>';
  return newsfeedHtml;
};

var addNewCapabilitiesHtml = function (newsfeedHtml, params, userOrgRole) {
  if (!params.capability.logoUrl) {
    params.capability.logoUrl = strings.PublicStaticContentDirectoryFullPrefixPath + "/images/logo-default.png";
  }
  newsfeedHtml +=
    '<li id="cap-' + params.date + '-' + params.idx + '" class="hover capability">' +
    '<div class="hover-text bg-green hidden-xs">Capability</div>' +
    '<i class="fa fa-puzzle-piece green"></i>' +
    '<div class="timeline-item">' +
    '<span class="time"><span class="label bg-green">Capability</span></span>' +
    '<a href="' + cfg.externalHostname + '/capabilities/' + params.capability.urlFriendlyID + '">' +
    '<div class="crop-wrapper">' +
    '<div class="crop"><img src="' + params.capability.logoUrl + '" alt="' + params.capability.name + '" class="timeline-thumb"></div>' +
    '</div>' +
    '</a>' +
    '<h3 class="timeline-header no-border"><a href="' + cfg.externalHostname + '/capabilities/' + params.capability.urlFriendlyID + '">' + params.capability.name + '</a></h3>' +
    '<p>Organization: <a href="' + cfg.externalHostname + '/organization/' + params.organization.urlFriendlyID + '">' + params.organization.orgName + '</a></p>' +
    '<div class="tags">';

    for (var idx in params.capability.category) {
      newsfeedHtml +=
        '<button type="button" class="btn btn-xs btn-default">' + params.capability.category[idx] + '</button>';
    }
    newsfeedHtml +=
    '</div>' +
    '<div class="actions">';
    userOrgRole = userOrgRole.toLowerCase();
    if (userOrgRole.indexOf(organizationRoles.client) > -1 || userOrgRole.indexOf(organizationRoles.both) > -1 ||
      userOrgRole.indexOf(organizationRoles.communityOwner) > -1) {
      newsfeedHtml +=
        '<a class="btn btn-primary btn-xs" href="' + cfg.externalHostname + '/conversations"><i class="fa fa-comment"></i> Start a Conversation</a> ';
    }
    newsfeedHtml +=
    '<a class="btn btn-info btn-xs" href="' + cfg.externalHostname + '/capabilities/' + params.capability.urlFriendlyID + '"><i class="fa fa-eye"></i> View</a>' +
    '</div>' +
    '</div>' +
    '</li>';
  return newsfeedHtml;
};

var addNewProblemsHtml = function (newsfeedHtml, params) {
  // Finding this doesn't always exist when testing on the dev server...
  if (!params.problem.thumbnail) {
    params.problem.thumbnail = "";
  }
  newsfeedHtml +=
    '<li id="prob-' + params.date + '-' + params.idx + '" class="hover problem">' +
    '<div class="hover-text bg-red hidden-xs">Problem</div>' +
    '<i class="fa fa-bullhorn red"></i>' +
    '<div class="timeline-item">' +
    '<span class="time"><span class="label bg-red">Problem</span></span>' +
    '<a href="' + cfg.externalHostname + '/problems/' + params.problem._id.toString() + '">' +
    '<div class="crop-wrapper">';

    if (!params.problem.thumbnail.name) {
      newsfeedHtml +=
      '<div class="crop"><img src="' + strings.PublicStaticContentDirectoryFullPrefixPath + '/images/logo-default.png" alt="' + params.problem.name + '" class="timeline-thumb"></div>';
    }
    else {
      newsfeedHtml +=
      '<div class="crop"><img src="/docs/' + params.problem.thumbnail.name + '" alt="' + params.problem.name + '" class="timeline-thumb"></div>';
    }

    newsfeedHtml +=
    '</div>' +
    '</a>' +
    '<h3 class="timeline-header no-border"><a href="' + cfg.externalHostname + '/problems/' + params.problem._id.toString() + '">' + params.problem.name + '</a></h3>' +
    '<p>Posted by: <a href="' + cfg.externalHostname + '/organization/' + params.organization.urlFriendlyID + '">' + params.organization.orgName + '</a></p>' +
    '<div class="tags">';

    for (var idx in params.problem.categories) {
      newsfeedHtml +=
       '<button type="button" class="btn btn-xs btn-default">' + params.problem.categories[idx] + '</button>';
    }
    newsfeedHtml +=
    '</div>' +
    '<div class="actions">' +
    '<a class="btn btn-primary btn-xs" href="' + cfg.externalHostname + '/problems/' + params.problem._id.toString() + '"><i class="fa fa-rocket"></i> Submit a Solution</a> ' +
    '<a class="btn btn-info btn-xs" href="' + cfg.externalHostname + '/problems/' + params.problem._id.toString() + '"><i class="fa fa-eye"></i> View</a> ' +
    '</div>' +
    '</div>' +
    '</li>';
  return newsfeedHtml;
};

var addNewNewsHtml = function (newsfeedHtml, params, userOrgRole) {
  if (!params.news.image){
    params.news.image = "";
  }
  newsfeedHtml +=
    '<li id="news-' + params.date + '-' + params.idx + '" class="hover news">' +
    '<div class="hover-text bg-teal hidden-xs">News</div>' +
    '<i class="fa fa-newspaper-o teal"></i>' +
    '<div class="timeline-item">' +
    '<span class="time"><span class="label bg-teal">News</span></span>' +
    '<a href="' + cfg.externalHostname + '/community/about/' + params.community.urlFriendlyID + '/news/' + params.news.urlFriendlyID + '">' +
    '<div class="crop-wrapper">';
    if (!params.news.image.path) {
      newsfeedHtml +=
        '<div class="crop"><img src="' + strings.PublicStaticContentDirectoryFullPrefixPath + '/images/logo-default.png" alt="' + params.news.headline + '" class="timeline-thumb"></div>';
    }
    else {
      var split = params.news.image.path.split('/');
      newsfeedHtml +=
        '<div class="crop"><img src="/docs/' + split[split.length-1] + '" alt="' + params.news.headline + '" class="timeline-thumb"></div>';
    }
    newsfeedHtml +=
    '</div>' +
    '</a>' +
    '<h3 class="timeline-header no-border"><a href="' + cfg.externalHostname + '/community/about/' + params.community.urlFriendlyID + '/news/' + params.news.urlFriendlyID + '">' + params.news.headline + '</a></h3>' +
    '<p>Posted by: <a href="' + cfg.externalHostname + '/organization/' + params.organization.urlFriendlyID + '">' + params.organization.orgName + '</a></p>' +
    '<div class="tags">';
    for (var idx in params.news.categories) {
      newsfeedHtml +=
        '<button type="button" class="btn btn-xs btn-default">' + params.news.categories[idx] + '</button>';
    }
    newsfeedHtml +=
    '</div>' +
    '<div class="actions">';
    userOrgRole = userOrgRole.toLowerCase();
    if (userOrgRole.indexOf(organizationRoles.client) > -1 || userOrgRole.indexOf(organizationRoles.both) > -1 ||
      userOrgRole.indexOf(organizationRoles.communityOwner) > -1) {
      newsfeedHtml +=
        '<a class="btn btn-primary btn-xs" href="' + cfg.externalHostname + '/conversations"><i class="fa fa-comment"></i> Start a Conversation</a> ';
    }
    newsfeedHtml +=
    '<a class="btn btn-info btn-xs" href="' + cfg.externalHostname + '/community/about/' + params.community.urlFriendlyID + '/news/' + params.news.urlFriendlyID + '"><i class="fa fa-eye"></i> View</a> ' +
    '</div>' +
    '</div>' +
    '</li>';
  return newsfeedHtml;
};

accountController.admin = {};
accountController.admin.list = {};
accountController.admin.list.get = function (req, res) {
  accounts.find().lean().exec(function (err, users) {
    if (err) {
      logger.error(err);
    }

    var updatedUsers = [];
    var usersLength = users.length;

    organizations.find({}, '_id orgName').lean().exec(function (err, orgs) {
      for (var i = 0; i < usersLength; i++) {
        users[i].lastNameSort = users[i].lastName.toLowerCase(); //users[i].lastNameNormalized;

        var orgMatch = orgs.filter(function (org) {
          if (typeof(users[i].orgRef) !== 'undefined') {
            return org._id.id === users[i].orgRef.id;
          }
        });
        if (typeof(orgMatch) !== 'undefined' && typeof(orgMatch[0]) !== 'undefined' && typeof(orgMatch[0].orgName) !== 'undefined') {
          users[i].orgName = orgMatch[0].orgName;
        } else {
          users[i].orgName = 'n/a';
        }
        updatedUsers.push(users[i]);
      }

      users = objectTools.sortByKey(users, 'lastNameSort');
      res.render('account/admin-list', {users: users});
    });
  });
};

accountController.admin.list.isApproved = function (req, res) {
  accounts.findById(req.body.id, function (err, doc) {
    if (doc) {
      doc.approved = req.body.approved;
      var tempPassword = uuid.v1();
      if (doc.approved) {
        doc.password = auth.createPasswordHash(tempPassword);
      }
      doc.save(function (saveErr) {
        if (saveErr) {
          res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'Cannot mark the user account approved. Please contact helpdesk@jivango.com'});
        }
        else if (doc.approved) {
          if (!doc.verifiedAccount) {
            var userDisplayName = doc.username;
            var resetUrl = req.protocol + '://' + req.get('host') + '/welcome/' + doc._id + '/' + tempPassword;
            if (doc.firstName && doc.lastName) {
              userDisplayName = doc.firstName + ' ' + doc.lastName;
            }
            var text = stringHelper.format(strings.Emails.userAdminApproved.text, userDisplayName, resetUrl);
            var html = stringHelper.format(strings.Emails.userAdminApproved.html, userDisplayName, resetUrl);
            emailer.sendEmail({
              from: cfg.helpDeskEmail,
              to: doc.email,
              subject: strings.Emails.userAdminApproved.subject,
              text: text,
              html: html
            });
            res.status(httpStatus.ACCEPTED).json({
              message: 'Thank you! User account has been activated.',
              verified: true
            });
          }
          else {
            res.status(httpStatus.ACCEPTED).json({message: 'Thank you! User account has been activated.'});
          }
        } else {
          problemsModel.removeProblemManager(req.body.id, function() {
            res.status(httpStatus.ACCEPTED).json({message: 'User account is not activated.'});
          });
        }
      });
    }
  });
};

accountController.admin.read = {};
accountController.admin.read.get = function (req, res) {
  //_getUser(req, res, req.params.username, 'account/admin-view');
  _getUserContactInformation(req.params.username, function (response, accountData, pocData) {
    if (response.error) {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: response.error});
    } else {
      res.render('account/admin-view', {accountData: accountData, pocData: pocData, username: req.params.username});
    }
  });
};

accountController.admin.update = {};
accountController.admin.update.get = function (req, res) {
  _getUser(req, res, req.params.username, 'account/admin-update');
};
accountController.admin.update.post = function (req, res) {
  var username = req.params.username;
  if (username) {
    accounts.findOne({username: username}, function (findErr, obj) {
      if (findErr) {
        logger.error(findErr);
        return;
      }

      var oldOrgRef = obj.orgRef;

      obj.firstName = req.body.firstName;
      obj.lastName = req.body.lastName;
      obj.phoneNumber = req.body.phoneNumber;
      obj.email = req.body.email;
      obj.orgRef = req.body.orgRef;
      obj.roles = [];
      if (req.body.admin) {
        obj.roles.push(accountRoles.Admin);
      }
      if (req.body.user) {
        obj.roles.push(accountRoles.User);
      }
      if (req.body.orgManager) {
        obj.roles.push(accountRoles.OrgManager);
      }

        obj.save(function (saveErr) {
          if (saveErr) {
            logger.error(saveErr);
          } else {


            if (req.body.password && req.body.confPassword) {
              var passStatus = auth.checkNewAndConfirmPasswords(req.body.password, req.body.confPassword);
              if (passStatus.error) {
                obj.error = passStatus.error;
              } else {
                auth.updatePassword(obj._id, req.body.password, function (err) {
                  if (err.error) {
                    obj.error = err.error;
                  }
                  organizations.find({}, function (orgErr, orgDocs) {
                    if(obj.orgRef !== oldOrgRef) {
                      problemsModel.removeProblemManager(obj._id, function() {
                        obj.organizations = orgDocs;
                        res.render('account/admin-update', obj);
                      });
                    } else {
                      obj.organizations = orgDocs;
                      res.render('account/admin-update', obj);
                    }

                  });
                });
              }
            }
            else {
              organizations.find({}, function (orgErr, orgDocs) {
                if(obj.orgRef !== oldOrgRef) {
                  problemsModel.removeProblemManager(obj._id, function () {
                    obj.organizations = orgDocs;
                    res.render('account/admin-update', obj);
                  });
                } else {
                  obj.organizations = orgDocs;
                  res.render('account/admin-update', obj);
                }
              });
            }
          }

        });



    });
  }
  else {
    _redirectForError(req, res);
  }
};

accountController.admin.create = {};
accountController.admin.create.get = function (req, res) {
  if (req.user.roles.indexOf('admin') > -1) {
    res.render('account/admin-create', {});
  }
  else {
    _redirectForError(req, res);
  }
};
accountController.admin.create.post = function (req, res) {
  if (req.body.password !== req.body.confPassword) {
    res.render('account/admin-create', {message: 'Passwords do not match', isAlert: true});
  }
  accounts.findOne({$or: [{'username': req.body.username}, {'email': req.body.email}]}, function (err, user) {
    if (err) {
      logger.error(err);
      res.render('account/admin-create', {message: 'Cannot process your request at this time', isAlert: true});
    }
    if (user) {
      res.render('account/admin-create', {message: 'User already Exists', isAlert: true});
    } else {
      accountsCreator(req.body.username,
        req.body.password, req.body.email,
        req.body.firstName, req.body.lastName,
        req.body.phoneNumber, null,
        function (err) {
          if (err) {
            logger.error(err);
            res.render('error', err);
          }
          accounts.find({}, function (err, docs) {
            res.render('account/admin-list', {
              title: 'Account Administration',
              users: docs
            });
          });
        });
    }
  });

};

accountController.admin.delete = {};
accountController.admin.delete.get = function (req, res) {
  _getUser(req, res, req.params.username, 'account/admin-delete');
};
accountController.admin.delete.post = function (req, res) {
  var username = req.params.username;
  if (username) {
    accounts.findOne({username: username}, function (userErr, user) {
      problemsModel.removeProblemManager(user._id, function() {
        user.remove(function (saveErr) {
          if (saveErr) {
            res.render('account/admin-delete', user);
          }
          res.redirect('/admin/users');
        });
      });
    });
  }
  else {
    res.redirect('/admin/users');
  }
};

module.exports = accountController;
