var organizationController = require('./organization'),
  accountController = require('./account'),
  validator = require('../utils/validation'),
  organization = require('../models/organizations').model,
  orgFactory = require('../models/organizations').creator,
  signupValidator = require('../utils/signup-field-validation'),
  account = require('../models/accounts').model,
  accountRoles = require('../models/accounts').roles,
  accountCreator = require('../models/accounts').creator,
  logger = require('../utils/logger'),
  cfg = require('../config'),
  strings = require('../config/strings'),
  sam = require('../utils/samGovHelper'),
  httpStatus = require('http-status'),
  notifier = require('../utils/notifier'),
  uuid = require('node-uuid'),
  MailChimpAPI = require('mailchimp').MailChimpAPI,
  auth = require('../auth'),
  // This require is for the GSM pivot (i.e. removing communities)
  communitiesModel = require('../models/communities').model;

var joinController = {};

var _validateUserInput = function (userObject, callback) {
  if (!validator.isValidPhoneNumber(userObject.email)) {
    callback({message: 'Invalid email'});
  }
  else if (!validator.isValidPhoneNumber(userObject.phoneNumber)) {
    callback({message: 'Invalid phone number'});
  }
  else {
    callback(null);
  }
};

var _saveAccount = function (req, res, callback) {
  var newAccount = req.session.join.account;
  var username = newAccount.firstName + '.' + newAccount.lastName;

  // Find out whether a duplicate username exists and append
  // a number to the end if it exists
  account.find({username: new RegExp('^' + username, 'i')}, function (err, users) {
    if (err) {
      return err;
    } else {
      if (users.length > 0) {
        username = username + users.length;
      }
    }
  });

  var samPOCInfo = req.session.join.samPoc;
  var orgInfo = req.session.join.organization;
  if (!orgInfo) {
    callback({message: 'Could not find an organization for this account'}, null);
  }
  else {
    organization.findOne({'orgName': orgInfo.orgName}, function (err, orgDoc) {
      if (err) {
        logger.error(err);
        callback({message: 'Error occurred while trying to find an organization for the new user'}, null);
      }
      else if (!orgDoc) {
        callback({message: 'No organization found with that Name'}, null);
      }
      else {
        var tempPassword = uuid.v1();
        accountCreator(username, tempPassword, newAccount.email, newAccount.firstName, newAccount.lastName, newAccount.phoneNumber,
          orgDoc,
          function (err, updateAccount) {
            var mcReq = {
              id: cfg.mailchimp.listID,
              email: {email: newAccount.email},
              merge_vars: {
                EMAIL: newAccount.email,
                FNAME: newAccount.firstName,
                LNAME: newAccount.lastName,
        				MMERGE3: orgDoc.orgName
              },
              double_optin: false
            };

            try {
              var api = new MailChimpAPI(cfg.mailchimp.apiKey, {version: '2.0'});
            } catch (error) {
              logger.error(error);
              console.log(error.message);
            }
            if (process.env.NODE_ENV === 'production-gsm') {
              api.call('lists', 'subscribe', mcReq, function (error, data) {
                if (error) {
                  logger.error(error);
                  console.log(error.message);
                }
                else {
                  console.log(JSON.stringify(data)); // Log data of subscription
                }
              });
            }
            else {
              logger.info('Skipping call to add user to the mailchimp subscriber list.');
            }
            if (updateAccount.email.toLowerCase() == orgDoc.businessPocEmail.toLocaleLowerCase()) {
              updateAccount.approved = true;
              updateAccount.save(function (saveErr) {
                logger.error(saveErr);
                callback(err, updateAccount);
              });
            }
            else {
              callback(err, updateAccount);
            }
          });
      }
    });
  }
};
var _saveOrganization = function (req, res, callback) {
  var newOrg = req.session.join.organization;
  orgFactory(newOrg.orgName, newOrg.orgAddress, newOrg.orgWebsite, newOrg.orgRole, newOrg.orgType, newOrg.orgId.value,
    newOrg.orgNaics, newOrg.businessPocFirstName, newOrg.businessPocLastName, newOrg.businessPocPhone,
    newOrg.businessPocEmail, newOrg.technicalPocFirstName, newOrg.technicalPocLastName, newOrg.technicalPocPhone,
    newOrg.technicalPocEmail, newOrg.primaryPoc, newOrg.approved, newOrg.screenShots, newOrg.logoUrl,
    newOrg.tagline, newOrg.location, newOrg.marketArea, newOrg.yearFounded, newOrg.size, newOrg.description,
    newOrg.currentCustomers, newOrg.primaryOffering, newOrg.revenue, newOrg.strengths, newOrg.weaknesses, callback);
};
var _saveInformation = function (req, res, callback) {
  if (!req.session.join.isNew) {
    //NOTE: Just creating a user
    _saveAccount(req, res, callback);
  }
  else {
    //NOTE: Creating a user and organization
    _saveOrganization(req, res, function (err) {
      if (err) {
        callback(err);
      }
      else {
        // This is for the GSM pivot 
        // Automatically add new organizations to the GSM community
        var query = {
          urlFriendlyID: 'geoint-solutions-marketplace'
        };
        communitiesModel.findOne(query, function(findCommunityError, communityDocument) {
          if (findCommunityError) {
            logger.error(findCommunityError);
          }
          else {
            if (communityDocument) {
              var query = {
                orgName: req.session.join.organization.orgName
              };
              organization.findOne(query, function(organizationFindError, organizationDocument) {
                if (organizationFindError) {
                  logger.error(organizationFindError);
                }
                else {
                  if (organizationDocument) {
                    communityDocument.members.push(organizationDocument._id);
                    communityDocument.save(function(communitySaveError){
                      logger.error(communitySaveError);
                    });
                  }
                }
              });
            }
          }
        });
        _saveAccount(req, res, callback);
      }
    });
  }
};
var _notifyPoc = function (req, res) {
  account.findOne({'email': req.session.join.account.email}, function (userFindErr, user) {
    if (userFindErr) {
      logger.error(userFindErr);
      notifier.notifyHelpDeskOfError('Trying to look up a use for ' + req.session.join.account.email
        + ' during the registration process and a Error occurred', userFindErr);
    }
    else {
      if (user.approved && user.verifiedAccount && user.roles.indexOf(accountRoles.OrgManager)) {
        var tempPassword = uuid.v1();
        user.password = auth.createPasswordHash(tempPassword);
        user.save(function (err) {
          if (err) {
            logger.error(err);
          }
          else {
            var resetUrl = req.protocol + '://' + req.get('host') + '/welcome/' + user._id + '/' + tempPassword;
            notifier.notifyUserOfApproval(user, resetUrl);
          }
        });
      }
      else {
        notifier.notifyOrganizationOfNewUser(user);
      }
    }
  });
};

joinController.createAccount = function (req, res) {
  // Check for invalid fields in the user account and organization data fields
  accountController.validateAccountDataFields(req, res, function (response) {
    if (response.error) {
      res.render("join", {formValues: req.body, error: response.error});
    } else {
      organizationController.validateOrganizationDataFields(req, res, function (response) {
        if (response.error) {
          res.render("join", {formValues: req.body, error: response.error});
        } else {
          // Create the new account
          organizationController.createOrganization(req, res, function (response, organization) {
            if (response.error) {
              res.render("join", {formValues: req.body, error: response.error});
            } else {
              // Create the new organization
              accountController.createAccount(req, res, organization, function (response) {
                if (response.error) {
                  res.render("join", {formValues: req.body, error: response.error});
                } else {
                  res.render("OrgSubmitThanks");
                }
              });
            }
          });
        }
      });
    }
  });
};

joinController.user = {};
joinController.user.userprofile = {};
joinController.user.userprofile.get = function (req, res) {
  if (!req.session.join || !req.session.join.organization) {
    res.redirect('/join');//NOTE: If the join object is not part of the session redirect to starting point
  }
  else {
    res.render('join/newUserProfile', {
      account: req.session.join.account,
      organization: req.session.join.organization
    });
  }
};
joinController.user.userprofile.post = function (req, res) {
  if (!req.session.join || !req.session.join.organization) {
    res.redirect('/join');//NOTE: If the join object is not part of the session redirect to starting point
  }
  else if (!req.body.firstname || !req.body.lastname || !req.body.phonenumber || !req.body.email) {
    res.render('join/newUserProfile', {
      message: 'Please fill out all fields',
      formData: req.body,
      isAlert: true,
      organization: req.session.join.organization
    });
  }
  else if (req.body.email !== req.body.confirmemail) {
    res.render('join/newUserProfile', {
      message: 'The emails do not match',
      formData: req.body,
      isAlert: true,
      organization: req.session.join.organization
    });
  }
  else {
    var newUserObj = {};
    newUserObj.firstName = req.body.firstname;
    newUserObj.lastName = req.body.lastname;
    newUserObj.phoneNumber = req.body.phonenumber;
    newUserObj.email = req.body.email;
    account.find({'email': req.body.email}, function (err, docs) {
      if (docs.length > 0) {

        res.render('join/newUserProfile', {
          message: 'This email already exists',
          isAlert: true,
          account: newUserObj,
          organization: req.session.join.organization
        });
      } else {

        _validateUserInput(newUserObj, function (err) {
          if (err) {
            res.render('join/newUserProfile', {
              message: err.message,
              formData: req.body,
              isAlert: true,
              organization: req.session.join.organization
            });
          }
          else {
            req.session.join.account = newUserObj;
            res.redirect('/join/tos');
          }
        });
      }
    });
  }
};

joinController.user.pocApprove = {};
joinController.user.pocApprove.get = function (req, res) {
  account.findOne({_id: req.params.id}, function (userFindErr, user) {
    if (userFindErr) {
      //TODO(ubergoober) Need to log/email someone or do something with this error, or this user will be forever waiting.
    } else {
      //req.body.id = user.id;
      //accountController.admin.list.isApproved(req,res);
      res.render('join/pocNewUserApproval', {userDoc: user});
    }
  });
};
joinController.user.pocApprove.post = function (req, res) {
  accountController.admin.list.isApproved(req, res);
};

joinController.user.pocDeny = {};
joinController.user.pocDeny.get = function (req, res) {
  account.findOne({_id: req.params.id}, function (userFindErr, user) {
    if (userFindErr) {
      logger.error(userFindErr);
      res.render('error', userFindErr);
    } else {
      res.render('join/pocNewUserDeny', {userDoc: user});
    }
  });
};
joinController.user.pocDeny.post = function (req, res) {
  account.findById(req.body.id, function (err, accountDoc) {
    if (err) {
      logger.error(err);
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'Cannot process your request at this time'});
    }
    else {
      notifier.notifyUserOfDenial(accountDoc);
      accountDoc.remove(function (removeErr) {
        if (removeErr) {
          logger.error(removeErr);
          res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'Cannot process your request at this time'});
        }
        else {
          res.status(httpStatus.ACCEPTED).json({message: 'User account has been denied.'});
        }
      });
    }
  });
};

joinController.user.list = {};

joinController.user.list.all = {};
// Return all approved organizations in the database
joinController.user.list.all.get = function (req, res) {
  organization.find({approved: true}, {_id: 1, orgName: 1})
    .sort({orgName: 1}).exec(function (err, orgDocs) {
      if (err) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({error: "Error: " + err});
      } else if (orgDocs.length !== 0) {
        res.status(httpStatus.OK).json(orgDocs);
      } else if (orgDocs.length === 0) {
        res.status(httpStatus.OK).json({});
      }
    });
};

joinController.user.list.check = {};
joinController.user.list.check.name = {};

joinController.user.list.check.name.post = function (req, res) {
  req.session.join = {};
  req.session.join.account = {};
  req.session.join.organization = {};
  var statusMessage = signupValidator.isValidOrganizationName(req.body.orgName);
  if (statusMessage === true) {
    organizationController.getOrganizationByName(req, res, function (orgDoc, message) {
      if (orgDoc) {
        req.session.join.organization = orgDoc;
        res.redirect('/join/newprofile');
      } else if (!orgDoc) {
        req.session.join.orgName = req.body.orgName;
        res.redirect('/join/organization');
      }
      if (message.error) {
        res.render('join/organizationLookup',
          {
            message: message.error,
            orgName: req.body.orgName,
            isAlert: true
          });
      }
    });
  } else {
    res.render('join/organizationLookup',
      {
        message: statusMessage,
        orgName: req.body.orgName,
        isAlert: true
      });
  }
};

joinController.user.list.getSamGovOrganization = {};
joinController.user.list.getSamGovOrganization.get = function (req, res) {
  var duns = req.params.orgDuns;
  var statusMessage = signupValidator.isValidDunsNumber(duns);
  var newOrganization = new organization();

  if (statusMessage === true) {
    // TODO: Add plus 4 capability to duns entries
    sam.getOrganizationInformation(duns, '0000', function (err, samData) {
      if (typeof(req.session.join) === 'undefined') {
        req.session.join = {};
        req.session.join.organization = null;
      }
      if (err) {
        return res.json({message: err.message});
      }
      else if (!samData) {
        return res.json({message: 'No organization data available from SAM.Gov'});
      }
      else {
        var samResponse = samData.sam_data.registration;
        newOrganization.orgName = samResponse.legalBusinessName;
        newOrganization.orgWebsite = typeof(samResponse.corporateUrl) === 'undefined' ? '' : samResponse.corporateUrl;
        newOrganization.orgAddress = samResponse.mailingAddress.Line1 + ' ' + samResponse.mailingAddress.City + ', '
          + samResponse.mailingAddress.stateorProvince + ' ' + samResponse.mailingAddress.Zip;

        newOrganization.businessPocFirstName = samResponse.electronicBusinessPoc.firstName;
        newOrganization.businessPocLastName = samResponse.electronicBusinessPoc.lastName;
        newOrganization.businessPocEmail = samResponse.electronicBusinessPoc.email;
        newOrganization.businessPocPhone = samResponse.electronicBusinessPoc.usPhone;

        newOrganization.technicalPocFirstName = typeof(samResponse.altElectronicBusinessPoc) === 'undefined' ? samResponse.electronicBusinessPoc.firstName : samResponse.altElectronicBusinessPoc.firstName;
        newOrganization.technicalPocLastName = typeof(samResponse.altElectronicBusinessPoc) === 'undefined' ? samResponse.electronicBusinessPoc.lastName : samResponse.altElectronicBusinessPoc.lastName;
        newOrganization.technicalPocEmail = typeof(samResponse.altElectronicBusinessPoc) === 'undefined' ? samResponse.electronicBusinessPoc.email : samResponse.altElectronicBusinessPoc.email;
        newOrganization.technicalPocPhone = typeof(samResponse.altElectronicBusinessPoc) === 'undefined' ? samResponse.electronicBusinessPoc.usPhone : samResponse.altElectronicBusinessPoc.usPhone;
        newOrganization.orgId = {name: 'orgDuns', value: duns};

        req.session.join.organization = newOrganization;
        req.session.join.samPoc = {
          firstName: samResponse.electronicBusinessPoc.firstName,
          lastName: samResponse.electronicBusinessPoc.lastName,
          email: samResponse.electronicBusinessPoc.email
        };
        req.session.join.isNew = true;
        return res.json({organization: newOrganization});
      }
    });
  } else {
    return res.json({message: statusMessage});
  }
};

joinController.user.list.check.govemail = {};
joinController.user.list.check.govemail.post = function (req, res) {
  var statusMessage = signupValidator.isValidEmailAddress(req.body.govEmail, "government email address");
  if (statusMessage !== true) {
    return res.json({message: statusMessage});
  }
  if (!(/(.gov|.mil)$/).test(req.body.govEmail)) {
    return res.json({message: 'A .gov or .mil email address must be used.'});
  }
  return res.json({});
};

joinController.user.list.check.orgInfo = {};
joinController.user.list.check.orgInfo.post = function (req, res) {
  var statusMessage = signupValidator.isValidOrganizationName(req.body.orgName);
  if (statusMessage !== true) {
    return res.json({message: statusMessage});
  }
  statusMessage = signupValidator.isValidOrganizationAddress(req.body.orgAddress);
  if (statusMessage !== true) {
    return res.json({message: statusMessage});
  }
  statusMessage = signupValidator.isValidOrganizationWebsite(req.body.orgWebsite);
  if (statusMessage !== true) {
    return res.json({message: statusMessage});
  }
  res.json({});
};

joinController.user.list.check.orgPocInfo = {};
joinController.user.list.check.orgPocInfo.post = function (req, res) {
  var statusMessage = signupValidator.isValidPersonName(req.body.businessPocFirstName, "business point of contact first name");
  if (statusMessage !== true) {
    return res.json({message: statusMessage});
  }
  statusMessage = signupValidator.isValidPersonName(req.body.businessPocLastName, "business point of contact last name");
  if (statusMessage !== true) {
    return res.json({message: statusMessage});
  }
  statusMessage = signupValidator.isValidEmailAddress(req.body.businessPocEmail, "business point of contact email address");
  if (statusMessage !== true) {
    return res.json({message: statusMessage});
  }
  statusMessage = signupValidator.isValidPhoneNumber(req.body.businessPocPhone, "business point of contact phone number");
  if (statusMessage !== true) {
    return res.json({message: statusMessage});
  }
  statusMessage = signupValidator.isValidPersonName(req.body.technicalPocFirstName, "technical point of contact first name");
  if (statusMessage !== true) {
    return res.json({message: statusMessage});
  }
  statusMessage = signupValidator.isValidPersonName(req.body.technicalPocLastName, "technical point of contact last name");
  if (statusMessage !== true) {
    return res.json({message: statusMessage});
  }
  statusMessage = signupValidator.isValidEmailAddress(req.body.technicalPocEmail, "technical point of contact email address");
  if (statusMessage !== true) {
    return res.json({message: statusMessage});
  }
  statusMessage = signupValidator.isValidPhoneNumber(req.body.technicalPocPhone, "technical point of contact phone number");
  if (statusMessage !== true) {
    return res.json({message: statusMessage});
  }
  res.json({});
};

joinController.user.newOrganization = {};
joinController.user.newOrganization.get = function (req, res) {
  res.render('join/newOrganization', {});
};
joinController.user.newOrganization.post = function (req, res) {
  if (!req.session.join) {
    req.session.join = {};
  }
  if (!req.session.join.organization) {
    req.session.join.organization = {};
  }
  if (!req.session.join.account) {
    req.session.join.account = {};
    req.session.join.email = {};
  }

  // Perform field validations
  var statusMessage = signupValidator.isValidOrganizationName(req.body.orgName);
  if (statusMessage !== true) {
    return res.render('join/newOrganization', {message: statusMessage});
  }
  statusMessage = signupValidator.isValidOrganizationAddress(req.body.orgAddress);
  if (statusMessage !== true) {
    return res.render('join/newOrganization', {message: statusMessage});
  }
  statusMessage = signupValidator.isValidOrganizationWebsite(req.body.orgWebsite);
  if (statusMessage !== true) {
    return res.render('join/newOrganization', {message: statusMessage});
  }
  statusMessage = signupValidator.isValidPersonName(req.body.businessPocFirstName, "business point of contact first name");
  if (statusMessage !== true) {
    return res.render('join/newOrganization', {message: statusMessage});
  }
  statusMessage = signupValidator.isValidPersonName(req.body.businessPocLastName, "business point of contact last name");
  if (statusMessage !== true) {
    return res.render('join/newOrganization', {message: statusMessage});
  }
  statusMessage = signupValidator.isValidEmailAddress(req.body.businessPocEmail, "business point of contact email address");
  if (statusMessage !== true) {
    return res.render('join/newOrganization', {message: statusMessage});
  }
  statusMessage = signupValidator.isValidPhoneNumber(req.body.businessPocPhone, "business point of contact phone number");
  if (statusMessage !== true) {
    return res.render('join/newOrganization', {message: statusMessage});
  }
  statusMessage = signupValidator.isValidPersonName(req.body.technicalPocFirstName, "technical point of contact first name");
  if (statusMessage !== true) {
    return res.render('join/newOrganization', {message: statusMessage});
  }
  statusMessage = signupValidator.isValidPersonName(req.body.technicalPocLastName, "technical point of contact last name");
  if (statusMessage !== true) {
    return res.render('join/newOrganization', {message: statusMessage});
  }
  statusMessage = signupValidator.isValidEmailAddress(req.body.technicalPocEmail, "technical point of contact email address");
  if (statusMessage !== true) {
    return res.render('join/newOrganization', {message: statusMessage});
  }
  statusMessage = signupValidator.isValidPhoneNumber(req.body.technicalPocPhone, "technical point of contact phone number");
  if (statusMessage !== true) {
    return res.render('join/newOrganization', {message: statusMessage});
  }

  req.session.join.isNew = true;
  req.session.join.organization.orgName = req.body.orgName;
  req.session.join.organization.orgAddress = req.body.orgAddress;
  req.session.join.organization.orgWebsite = req.body.orgWebsite;
  req.session.join.organization.businessPocFirstName = req.body.businessPocFirstName;
  req.session.join.organization.businessPocLastName = req.body.businessPocLastName;
  req.session.join.organization.businessPocEmail = req.body.businessPocEmail;
  req.session.join.organization.businessPocPhone = req.body.businessPocPhone;
  req.session.join.organization.technicalPocFirstName = req.body.technicalPocFirstName;
  req.session.join.organization.technicalPocLastName = req.body.technicalPocLastName;
  req.session.join.organization.technicalPocEmail = req.body.technicalPocEmail;
  req.session.join.organization.technicalPocPhone = req.body.technicalPocPhone;
  req.session.join.organization.orgType = req.body.orgType;
  req.session.join.organization.orgRole = req.body.orgRole;
  req.session.join.organization.orgId = {name: 'orgDuns', value: req.body.duns};

  req.session.join.account.email = req.body.govEmail;

  res.redirect('/join/newprofile');
};

joinController.user.tos = {};
joinController.user.tos.get = function (req, res) {
  if (!req.session.join || !req.session.join.organization) {
    res.redirect('/join/lookup');//NOTE: If the join object is not part of the session redirect to starting point
  }
  else if (!req.session.join || !req.session.join.account) {
    res.redirect('/join/newprofile');//NOTE: If the join object is not part of the session redirect to starting point
  }
  else {
    res.render('join/termsOfService', {
      account: req.session.join.account,
      organization: req.session.join.organization
    });
  }
};
joinController.user.tos.post = function (req, res) {
  if (!req.body.tosagree) {
    res.render('join/termsOfService', {
      account: req.session.join.account,
      organization: req.session.join.organization
    });
  }
  else {
    _saveInformation(req, res, function (err) {
      if (err) {
        req.session.join = {};
        res.render('join/status', {
          message: 'Cannot process your request at this time. Please contact an administrator at helpdesk@jivango.com',
          isAlert: true
        });
      }
      else {
        _notifyPoc(req, res);
        res.redirect('/join/complete');
      }
    });
  }
};

joinController.user.finished = {};
joinController.user.finished.get = function (req, res) {
  var isNew = req.session.join.isNew;
  req.session.join = {};
  var renderObj = {};
  if (req.session.join.error) {
    renderObj.message = req.session.join.error.msg;
    renderObj.isAlert = req.session.join.error.isAlert;
  }
  if (isNew) {
    renderObj.isNew = isNew;
  }

  res.render('join/status', renderObj);
};

module.exports = joinController;