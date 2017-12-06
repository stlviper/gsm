var account = require('./models/accounts').model,
  organization = require('./models/organizations').model,
  communityModel = require('./models/communities').model,
  cfg = require('./config'),
  flash = require('connect-flash'),
  logger = require('./utils/logger'),
  bCrypt = require('bcrypt-nodejs');

var auth = {};

var _createHash = function (password) {
  return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};

var _isValidPassword = function (user, password) {
  return bCrypt.compareSync(password, user.password);
};

auth.setPreviousPage = function(req, res, next){
  var previousPage  = req.headers.referer;
  res.locals.previousPage = previousPage;
  next();
};

auth.setUserInformation = function (req, res, next) {
  if (req.user) {
    organization.findOne({'_id': req.user.orgRef}, function (err, orgDoc) {
      communityModel.find({members: req.user.orgRef}, '_id name members urlFriendlyID', function (err, userCommunities) {
        if (err) {
          logger.error(err);
        }
        var userInfo = {
          username: req.user.username || '',
          firstName: req.user.firstName || '',
          lastName: req.user.lastName || '',
          orgRef: req.user.orgRef || '',
          isAdmin: (req.user.roles.indexOf('admin') > -1),
          isUser: (req.user.roles.indexOf('user') > -1),
          isOrgAdmin: (req.user.roles.indexOf('organizationManager') > -1) || (req.user.roles.indexOf('admin') > -1),
          isDiscoveryManager: (req.user.roles.indexOf('discoveryManager') > -1),
          isDiscoveryEvaluator: (req.user.roles.indexOf('discoveryEvaluator') > -1),
          email: req.user.email,
          id: req.user.id
        };
        if (orgDoc) {
          userInfo.orgRole = orgDoc.orgRole;
          userInfo.avatarRelative = orgDoc.logoUrl || '';
          req.secure = "https://" || "http://";
          userInfo.avatarFull = "http://" + req.headers.host + orgDoc.logoUrl || '';
          userInfo.canCreateProblems = (function(){
            userInfo.orgRole === 'client' || userInfo.orgRole === 'both' || (userInfo.orgRole === 'communityManager')
          })()
        }
        if(userCommunities){
          userInfo.userCommunities = userCommunities;
        }
        
        res.locals.isAdmin = userInfo.isAdmin;
        res.locals.isOrgAdmin = userInfo.isOrgAdmin;
        res.locals.userinfo = userInfo;
        next();
      });
    });
  }
  else {
    next();
  }
};

auth.isAuthenticated = function (req, res, next) {
  if (req.isAuthenticated()) {
    if (req.originalUrl.indexOf('/admin') === 0 && req.user.roles.indexOf('admin') < 0) {
      return res.redirect('/');
    }
    return next();
  }
  res.redirect('/');
};

auth.allowAnonymousUser = function (req, res, next) {
  if (!req.isAuthenticated() && !cfg.allowAnonymousUser) {
    return res.redirect('/signin');
  }
  else {
    return next();
  }
};

// Solution submissions should only be accessible to the discovery managers, evaluators, and MITRE api group
auth.isPermittedAccessToSolutionSubmission = function (req, res, next) {
  var organizationModel = require('./models/organizations').model;
  var solutionSubmissionModel = require('./models/registrations').Registration;
  var problemModel = require('./models/challenges').model;
  var filenameRequestedDocument = req.params.filename;
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }
  // Check whether the logged in user should be able to access the solution submission  
  else {
    // Find the problem where the solution submission file exists as an 'whitepaper' or 'otherDocument'
    var query = [
      {
        $match: {
          $or: [{'whitepaper.path': cfg.privateSolutionSubmissionFilesURL + '/' + filenameRequestedDocument},
                {otherDocuments: {$elemMatch: {path: cfg.privateSolutionSubmissionFilesURL + '/' + filenameRequestedDocument}}}]
        }
      }
    ];
    // Since uids are being used, this should only ever return a maximum of one solution submission document
    solutionSubmissionModel.aggregate(query, function(solutionSubmissionFindErr, solutionSubmissionDocument){
      if (solutionSubmissionFindErr) {
        logger.error(solutionSubmissionFindErr);
        return res.json({error: "There was an error making the request."});
      }
      else if (!solutionSubmissionDocument || solutionSubmissionDocument.length < 1) {
        return res.json({error: "The document could not be retrieved."});
      }  
      else {
        if (solutionSubmissionDocument[0]) {
          solutionSubmissionDocument = solutionSubmissionDocument[0];
        }
        // Find the problems that the user's organization owns
        problemModel.find({orgRef: res.locals.userinfo.orgRef}, function (problemFindErr, problemDocuments) {
          if (problemFindErr) {
            logger.error(problemFindErr);
            return res.json({error: "There was an error making the request."});
          }
          else {
            for (var idxProblemDocuments in problemDocuments) {
              var currentProblem = problemDocuments[idxProblemDocuments];
              // Check if the solution was submitted to a problem belonging to the user's organization
              if (solutionSubmissionDocument.challengeID.toString() === currentProblem._id.toString()) {
                return next();
              }
            }

            // Check for the case of outside problem managers and evaluators
            problemModel.find({}, function (problemFindErr, allProblemDocuments) {
              if (problemFindErr) {
                return res.json({error: "There was an error making the request."});
              }
              else {
                if (res.locals.userinfo.isDiscoveryManager || res.locals.userinfo.isDiscoveryEvaluator) {
                  for (var idxProblemDocuments in allProblemDocuments) {
                    var currentProblemDocument = allProblemDocuments[idxProblemDocuments];
                    if (solutionSubmissionDocument.challengeID.toString() === currentProblemDocument._id.toString()) {
                      for (var idxProblemManagers in currentProblemDocument.discoveryManagers) {
                        if (res.locals.userinfo.id.toString() === currentProblemDocument.discoveryManagers[idxProblemManagers].toString()) {
                          return next();
                        }
                      }
                      for (var idxProblemEvaluators in currentProblemDocument.discoveryEvaluators) {
                        if (res.locals.userinfo.id.toString() === currentProblemDocument.discoveryEvaluators[idxProblemEvaluators].toString()) {
                          return next();
                        }
                      }
                    }
                  }
                }

                // If the user is part of Mitre, allow them access to all solution submission attachments
                organizationModel.findOne({urlFriendlyID: "mitre-corporation"}, function(findErr, organizationDocument){
                  if (findErr) {
                    logger.error(findErr);
                    return res.json({error: "There was an error making the request."})
                  }
                  else if (organizationDocument && res.locals.userinfo.orgRef.toString() === organizationDocument._id.toString()) {
                    return next();
                  }
                  else {
                    // Allow site admins to get to any solution submission attachment
                   if (res.locals.userinfo.isAdmin) {
                     return next();
                   }
                    
                    // If the function has not returned at this point the user does not have permission
                    // to view the document
                    return res.json({message: "You do not have permission to access the requested document."});
                  }
                });
              }
            });
          }
        });
      }
    });
  }
};

auth.checkUserPassword = function (user, password, done) {
  done(_isValidPassword(user, password));
};

auth.serializeUser = function (user, done) {
  done(null, user._id);
};

auth.deserializeUser = function (id, done) {
  account.findById(id, function (err, user) {
    if (err) {
      logger.error(err);
    }

    // update this page access as last activity.
    user.lastActive = Date.now();
    user.save();

    done(err, user.approved ? user : null);
  });
};


auth.login = function (req, email, password, done) {
  var lowercaseEmail = email.toLowerCase();
  account.findOne({'email': new RegExp('^' + lowercaseEmail, 'i'), 'approved': true},
    function (err, user) {
      if (err) {
        logger.error(err);
        return done(err);
      }
      else if (!user) {
        logger.info('User Not Found with email ' + email);
        return done(null);
      }
      // User exists but wrong password, log the error
      else if (!_isValidPassword(user, password)) {
        return done(null);
      }
      else {
        req.session.join = null;
        user.lastLogon = Date.now();
        user.lastActive = Date.now();
        user.save();
        return done(null, user);
      }
    }
  );
};

auth.createPasswordHash = function (password) {
  return _createHash(password);
};

auth.checkNewAndConfirmPasswords = function (newPass, confirmPass) {
  // make sure pass isn't blank
  if (!newPass) {
    return {error: "<h1 class='icon'><span class='icon-warning-o'></span></h1>Hey! The new password field cannot be blank."};
  }

  // this needs to match the client side validation.
  var passw = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
  if (!newPass.match(passw)) {
    return {error: "<h1 class='icon'><span class='icon-warning-o'></span></h1>Sorry! Your password did not meet the requirements."};
  }
  else if (newPass !== confirmPass) {
    return {error: "<h1 class='icon'><span class='icon-warning-o'></span></h1>Oops! Your passwords did not match."};
  }
  return {};
};

auth.updatePassword = function (userID, newPass, next) {
  var error = '';
  account.findOne({_id: userID}, function (err, doc) {
    if (doc) {
      doc.password = auth.createPasswordHash(newPass.trim());
      doc.resetPasswordToken = undefined;
      doc.resetPasswordExpires = undefined;
      doc.save(function (error) {
        if (error) {
          error = 'There was an unexpected error.\nPlease try again or contact support.';
        } else {
          error = '';
        }
        next({error: error}, doc);
      });
    } else {
      next({error: 'No user found with that data.'});
    }
  });
};

module.exports = auth;