var express = require('express'),
  router = express.Router(),
  accounts = require('../models/accounts').model,
  accountController = require('../controllers/account'),
  communityController = require('../controllers/community').communityController,
  capabilityController = require('../controllers/product'),
  orgController = require('../controllers/organization'),
  problemController = require('../controllers/challenge'),
  registrationController = require('../controllers/registration'),
  emailer = require('../utils/emailer'),
  cfg = require('../config'),
  auth = require('../auth'),
  passport = require('passport'),
  joinController = require('../controllers/join'),
  disqusSSO = require('../utils/disqus.js'),
  forgotPass = require('../controllers/forgot_pass');

module.exports = function (passport) {

  //===========================================================================
  // Authentication Routes
  //===========================================================================
  router.get('/signin', function (req, res) {
    if (req.isAuthenticated()) {
      res.redirect('/');
    } else {
      res.render('login', {});
    }
  });
  router.post('/signin', function (req, res, callback) {
    passport.authenticate('login', function (err, user) {
      if (err) {
        return callback(err);
      }
      else if (!user) {
        return res.render('login', {error: 'Sign in failed. Please try again.'});
      }
      else {
        req.logIn(user, function (err) {
          if (err) {
            return callback(err);
          }
          else if (req.headers.referer && req.headers.origin && req.headers.referer.replace(req.headers.origin, '') === '/') {
            return res.redirect('/profile/' + user.username + '/manage');
          }
          else {
            return res.redirect('back');
          }
        });
      }
    })(req, res, callback);
  });

  //router.get('/make_exception_for_logging_test', nonExistantVariableToCauseAnException);
  router.get('/forgot/', accountController.forgotPassword.get);
  router.post('/forgot/', accountController.forgotPassword.post);
  router.get('/reset/:token', accountController.resetPassword.get);
  router.post('/reset/:token', accountController.resetPassword.post);
  router.get('/reactivate/:email', accountController.reactivateAccount.get);

  router.get('/logout', auth.allowAnonymousUser, function (req, res) {
    req.logout();
    console.log('user signed out');
    res.redirect('/');
  });
  //router.get('/join', auth.allowAnonymousUser, function (req, res) {
  //  res.render('join', {});
  //});
  router.post('/join', auth.allowAnonymousUser, function (req, res) {
    joinController.createAccount(req, res);
  });



  //===========================================================================
  // General Routes
  //===========================================================================
  router.get('/', auth.allowAnonymousUser, function (req, res) {
      res.render('index', { title: '', layout: 'themes/default/gsmlayout' });
  });

  router.get('/contact', auth.allowAnonymousUser, function (req, res) {
    res.render('help', {title: 'Contact Us'});
  });
  router.post('/contact', auth.allowAnonymousUser, function (req, res) {
    if (req.body.name && req.body.emailPhoneNumber && req.body.orgName && req.body.issueDescription && req.body.urgency) {

      var text = "Name:" + req.body.name + " \n" +
        "Email/Phone:" + req.body.emailPhoneNumber + " \n " +
        "Organization:" + req.body.orgName + " \n" +
        "Description:\n" + req.body.issueDescription + " \n " +
        "Urgency: " + req.body.urgency + "\n\n";

      var html = "";
      var msgObj = {
        from: cfg.helpDeskEmail,
        to: cfg.helpDeskEmail,
        subject: req.body.name + ' needs help',
        text: text,
        html: html
      };
      emailer.sendEmail(msgObj);
      res.render('help', {
        title: 'Contact Us',
        message: 'You message has been sent.',
        isAlert: false
      });
    }
    else {
      res.render('help', {
        title: 'Contact Us',
        message: 'Please fill out all fields',
        isAlert: true
      });
    }
  });

  router.get('/faq', auth.allowAnonymousUser, function (req, res) {
    res.render('faq', {title: 'FAQ'});
  });
  
  router.get('/favicon.ico', auth.allowAnonymousUser, function (req, res) {
    res.render('autodiscover', {title: 'autodiscover'});
  });

  router.get('/tos', auth.allowAnonymousUser, function (req, res) {
    res.render('tos', {title: 'Terms Of Service'});
  });
  
  router.get('/privacy', auth.allowAnonymousUser, function (req, res) {
    res.render('privacy', {title: 'Privacy Policy'});
  });

  router.get('/betachallenge', auth.allowAnonymousUser, function (req, res) {
    res.render('betachallenge', {
      title: 'Beta Challenge',
      disqusSSO: disqusSSO.getDisqusSSO(res),
      disqusShortName: cfg.disqus.shortname
    });
  });

  //===========================================================================
  // Marketspace Routes
  //===========================================================================
  router.get('/organization/:orgRouteId', auth.allowAnonymousUser, orgController.organization.get);

  if (cfg.useS3) {
    router.get('/images/organizations/:filename', auth.allowAnonymousUser, orgController.image.get);
  }

  router.get('/community/about/:urlNameID/organization/:orgRouteId', auth.allowAnonymousUser, orgController.organization.get); // Will be obsolete
  router.get('/members/:orgRouteId', auth.allowAnonymousUser, orgController.organization.get);
  router.get('/community/about/:urlNameID/news/:newsRouteID', auth.allowAnonymousUser, communityController.user.news.view.get); // Will be obsolete
  router.get('/news/:newsRouteID', auth.allowAnonymousUser, communityController.user.news.view.get);

  router.get('/capabilities/:name', auth.allowAnonymousUser, capabilityController.user.discuss.get);

  router.get('/marketspace/problems/:id', auth.allowAnonymousUser, problemController.view.get);
  router.get('/marketspace/problems', auth.allowAnonymousUser, problemController.list.get);

  router.post('/marketspace/problems', auth.isAuthenticated, problemController.list.post);
  router.get('/marketspace/problems/:id/register', auth.isAuthenticated, problemController.view.get);
  router.post('/marketspace/problems/:id/register', auth.isAuthenticated, problemController.register.post);
  router.post('/community/about/:urlNameID/', auth.isAuthenticated, capabilityController.user.list.post);


  //===========================================================================
  // Profile Routes
  //===========================================================================
  router.get('/profile/:username', auth.isAuthenticated, accountController.update.get);
  router.post('/profile/:username', auth.isAuthenticated, accountController.update.post);

  router.get('/profile/:username/manage', auth.isAuthenticated, accountController.manage.get);
  router.post('/profile/:username/manage', auth.isAuthenticated, accountController.manage.post);
  router.post('/profile/:username/orgAdmin', auth.isAuthenticated, accountController.manage.orgAdmin);
  router.post('/profile/:username/problemManager', auth.isAuthenticated, problemController.userList.discoveryManager);
  router.post('/profile/:username/problemEvaluator', auth.isAuthenticated, problemController.userList.discoveryEvaluator);

  router.post('/profile/:username/manage/removeimage', auth.isAuthenticated, accountController.removeImage.post);
  router.post('/profile/:username/org-files/removeimage', auth.isAuthenticated, accountController.removeImage.post);
  router.post('/profile/:username/manage/addImage', auth.isAuthenticated, accountController.addImage.post);

  router.get('/profile/:username/resetpass', auth.isAuthenticated, accountController.resetPassword.get);
  router.post('/profile/:username/resetpass', auth.isAuthenticated, accountController.resetPassword.post);

  router.get('/dashboard', auth.isAuthenticated, accountController.newsfeed.get);
  router.get('/dashboard/organizations/:startDate', auth.isAuthenticated, accountController.newsfeed.organizations.get);
  router.get('/dashboard/capabilities/:startDate', auth.isAuthenticated, accountController.newsfeed.capabilities.get);
  router.get('/dashboard/problems/:startDate', auth.isAuthenticated, accountController.newsfeed.problems.get);
  router.get('/dashboard/news/:startDate', auth.isAuthenticated, accountController.newsfeed.news.get);
  

  router.get('/profile/:username/org-profile', auth.isAuthenticated, accountController.organizationManage.get);
  router.post('/profile/:username/org-profile', auth.isAuthenticated, accountController.organizationManage.post);
  router.get('/profile/:username/org-users', auth.isAuthenticated, accountController.organizationUsers.get);
  router.get('/profile/:username/org-capabilities', auth.isAuthenticated, accountController.organizationCapabilities.get);
  router.get('/capability-edit/:id', auth.isAuthenticated, capabilityController.org.update.get);
  router.get('/profile/:username/org-files', auth.isAuthenticated, accountController.organizationFiles.get);
  router.get('/profile/:username/profile', auth.isAuthenticated, accountController.userProfile.get);
  router.post('/profile/:username/profile', auth.isAuthenticated, accountController.resetPassword.post);
  router.post('/profile/:username/updateProfile', auth.isAuthenticated, accountController.userProfile.post);
  router.get('/profile/:username/solution-submissions', auth.isAuthenticated, accountController.solutionSubmission.get);
  router.get('/viewMoreSubmissions/:offset', auth.isAuthenticated, accountController.viewMoreSubmissions.get);
  router.post('/registration/:id/delete', auth.isAuthenticated, registrationController.user.deleteReg.post);

  router.get('/community-memberships', auth.isAuthenticated, accountController.communityMemberships.get);
  router.get('/community-access', auth.isAuthenticated, accountController.communityAccess.get);
  router.get('/manage-news', auth.isAuthenticated, accountController.communityManageNews.get);
  
  router.get('/community-problems', auth.isAuthenticated, accountController.communityProblems.get);
  
  router.get('/my-problems', auth.isAuthenticated, accountController.myProblems.get);
  router.post('/my-problems', auth.isAuthenticated, accountController.myProblems.post);
  router.put('/my-problems', auth.isAuthenticated, accountController.myProblems.put);
  router.delete('/my-problems', auth.isAuthenticated, accountController.myProblems.delete); 
  
  //===========================================================================
  // Communities Routes
  //===========================================================================
  router.get('/profile/:username/manage/:urlNameID/news/:newsRouteID', auth.isAuthenticated, communityController.user.news.update.get);
  router.post('/profile/:username/manage/:urlNameID/news/:newsRouteID', auth.isAuthenticated, communityController.user.news.update.post);

  // These routes are for the dashboard modals; Due to time constraints, the old routes are going to be left untouched; TODO: Consolidate the dashboard and dedicated page functions for the news
  router.get('/news/:username/:communityUrlFriendlyId/:newsUrlFriendlyId', auth.isAuthenticated, communityController.user.news.dashboardUpdate.get);
  router.put('/news/:username/:communityUrlFriendlyId/:newsUrlFriendlyId', auth.isAuthenticated, communityController.user.news.dashboardUpdate.put);
  
  //===========================================================================
  // Communities Routes
  //===========================================================================


  router.get('/community/categories', auth.allowAnonymousUser, communityController.user.categories.get);
  router.post('/community/join', auth.isAuthenticated, communityController.user.join.post);
  router.post('/community/leave', auth.isAuthenticated, communityController.user.leave.post);
  router.post('/community/create', auth.isAuthenticated, communityController.user.create.post);
  router.post('/community/add-news-post', auth.isAuthenticated, communityController.api.addNewsPost.post);
  router.post('/community/removeNewsAttachment', auth.isAuthenticated, communityController.api.removeNewsAttachment.post);
  router.post('/community/remove-news-post', auth.isAuthenticated, communityController.api.removeNewsPost.post);

  router.get('/getallcommunities', auth.allowAnonymousUser, communityController.user.search.allApproved.get);
  router.post('/searchresults', auth.allowAnonymousUser, communityController.user.search.post);
  router.get('/searchresults', auth.allowAnonymousUser, communityController.user.search.get);
  router.get('/community/about/:urlNameID', auth.allowAnonymousUser, communityController.user.about.get);
  router.get('/community/about/:urlNameID/:edit', auth.allowAnonymousUser, communityController.user.about.get);
  router.post('/community/about/:urlNameID/update', auth.isAuthenticated, communityController.user.about.post);

  if (cfg.useS3) {
    router.get('/images/community/:filename', auth.allowAnonymousUser, communityController.user.image.get);
  }
  
  router.get('/about', auth.allowAnonymousUser, communityController.user.aboutInformation.get);
  router.get('/about/:edit', auth.allowAnonymousUser, communityController.user.aboutInformation.get);
  router.post('/about/update', auth.isAuthenticated, communityController.user.aboutInformation.post);
  
  router.get('/members', auth.allowAnonymousUser, communityController.user.members.get);
  router.get('/capabilities', auth.allowAnonymousUser, communityController.user.capabilities.get);
  router.post('/capabilities', auth.isAuthenticated, capabilityController.user.list.post);
  router.get('/problems', auth.allowAnonymousUser, communityController.user.problems.get);
  router.get('/news', auth.allowAnonymousUser, communityController.user.newspost.get);
  router.get('/data-depot', auth.allowAnonymousUser, communityController.user.dataDepot.get);
  router.get('/data-depot/:edit', auth.allowAnonymousUser, communityController.user.dataDepot.get);
  router.post('/data-depot/update', auth.isAuthenticated, communityController.user.dataDepot.post);
  router.get('/engage', auth.allowAnonymousUser, communityController.user.ngage.get);
  router.get('/engage/:edit', auth.allowAnonymousUser, communityController.user.ngage.get);
  router.post('/engage/update', auth.isAuthenticated, communityController.user.ngage.post);

  //===========================================================================
  // User Problems Manage Routes
  //===========================================================================
  router.post('/problems/create', auth.isAuthenticated, communityController.user.createProblem.post);
  router.get('/problems/:id', auth.allowAnonymousUser, problemController.view.get);
  router.get('/profile/:username/manage/solutions/:id/delete', auth.isAuthenticated, registrationController.user.delete.get);
  router.post('/profile/:username/manage/solutions/:id/delete', auth.isAuthenticated, registrationController.user.delete.post);
  router.post('/profile/:username/manage/solutions/:id/deletedocument', auth.isAuthenticated, registrationController.user.removeDoc.post);
  router.post('/profile/:username/manage/solutions/:id/deletewhitepaper', auth.isAuthenticated, registrationController.user.removeWhitePaper.post);
  router.get('/profile/:username/manage/solutions/:id/update', auth.isAuthenticated, registrationController.user.update.get);
  router.post('/profile/:username/manage/solutions/:id/update', auth.isAuthenticated, registrationController.user.update.post);
  router.get('/profile/:username/manage/solutions/:id/leavefeedback', auth.isAuthenticated, registrationController.user.feedback.create.get);
  router.post('/profile/:username/manage/solutions/:id/leavefeedback', auth.isAuthenticated, registrationController.user.feedback.create.post);
  router.get('/profile/:username/manage/solutions/:id/resumefeedback', auth.isAuthenticated, registrationController.user.feedback.update.get);
  router.post('/profile/:username/manage/solutions/:id/resumefeedback', auth.isAuthenticated, registrationController.user.feedback.update.post);
  router.post('/profile/:username/manage/solutions/:id/resumefeedback/:feedbackid/:feedbackdocumentname/deletefeedbackdocument', auth.isAuthenticated, registrationController.user.feedback.deletefeedbackdocument.post);
  router.post('/profile/:username/manage/solutions/:id/resumefeedback/:feedbackid/:otherdocumentname/deleteotherdocument', auth.isAuthenticated, registrationController.user.feedback.deleteotherdocument.post);
  router.get('/profile/:username/manage/solutions/:id/feedback/:feedbackid/:role', auth.isAuthenticated, registrationController.user.feedback.view.get);
  router.post('/profile/:username/manage/problems/:id/view/:registrationid/:feedbackid/submitproviderfeedback', auth.isAuthenticated, registrationController.user.feedback.submitproviderfeedback.post);
  router.get('/profile/:username/manage/solutions/:id', auth.isAuthenticated, registrationController.user.view.get);
  router.get('/profile/:username/manage/solutions/:id/export', auth.isAuthenticated, registrationController.user.exportPDF.get);
  router.get('/profile/:username/manage/solutions/:id/:role/readfeedback', auth.isAuthenticated, registrationController.user.viewFeedback.get);
  router.get('/solutions/search/:query', auth.isAuthenticated, registrationController.user.search.get);

  router.get('/profile/:username/manage/solutions/:id/createinternalassessment', auth.isAuthenticated, registrationController.user.createInternalAssessment.get);
  router.post('/profile/:username/manage/solutions/:id/createinternalassessment', auth.isAuthenticated, registrationController.user.createInternalAssessment.post);
  router.get('/profile/:username/manage/solutions/:id/:internalassessmentid/readinternalassessment', auth.isAuthenticated, registrationController.user.readInternalAssessment.get);
  router.get('/profile/:username/manage/solutions/:id/:internalassessmentid/updateinternalassessment', auth.isAuthenticated, registrationController.user.updateInternalAssessment.get);
  router.post('/profile/:username/manage/solutions/:id/:internalassessmentid/updateinternalassessment', auth.isAuthenticated, registrationController.user.updateInternalAssessment.post);
  router.post('/profile/:username/manage/solutions/:id/:internalassessmentid/updateinternalassessment/:attachmentuid/deleteattachment', auth.isAuthenticated, registrationController.user.updateInternalAssessment.deleteAttachment);
  router.delete('/profile/:username/manage/solutions/:id/:internalassessmentid/deleteinternalassessment', auth.isAuthenticated, registrationController.user.deleteInternalAssessment.delete);

  router.get('/profile/:username/manage/problems/create', auth.isAuthenticated, accountController.manage.challengeCreate.get);
  router.post('/profile/:username/manage/problems/create', auth.isAuthenticated, accountController.manage.challengeCreate.post);

  router.get('/profile/:username/manage/problems/:id/delete', auth.isAuthenticated, problemController.user.delete.get);
  router.post('/profile/:username/manage/problems/:id/delete', auth.isAuthenticated, problemController.user.delete.post);
  router.get('/profile/:username/manage/problems/:id/view', auth.isAuthenticated, problemController.registration.view.get);
  router.get('/profile/:username/manage/problems/:id/users', auth.isAuthenticated, problemController.userList.view.get);
  router.post('/profile/:username/manage/problems/:id/addDate', auth.isAuthenticated, problemController.api.addDate.post);
  router.post('/profile/:username/manage/problems/:id/addFeedback', auth.isAuthenticated, problemController.api.addFeedback.post);
  router.post('/profile/:username/manage/problems/:id/removeFeedback', auth.isAuthenticated, problemController.api.removeFeedback.post);
  router.post('/profile/:username/manage/problems/:id/removeDate', auth.isAuthenticated, problemController.api.removeDate.post);
  router.post('/profile/:username/manage/problems/:id/removeDoc', auth.isAuthenticated, problemController.api.removeDoc.post);
  router.post('/profile/:username/manage/problems/:id/updatefields', auth.isAuthenticated, problemController.api.updateCustomFields.post);
  router.get('/profile/:username/manage/problems/:id', auth.isAuthenticated, problemController.user.update.get);
  router.get('/profile/:username/manage/problems/:id/challengeview', auth.isAuthenticated, problemController.user.challengeview.get);
  router.post('/profile/:username/manage/problems/:id', auth.isAuthenticated, problemController.user.update.post);
  router.get('/problems/:id/getfields', auth.isAuthenticated, problemController.api.getCustomFields.get);
  router.post('/problems/:id/updatefields', auth.isAuthenticated, problemController.api.updateCustomFields.post);
  router.post('/problems/:id/updateregistrationdescription', auth.isAuthenticated, problemController.api.updateRegistrationDescription.post);

  if (cfg.useS3) {
    router.get('/docs/:filename', auth.allowAnonymousUser, problemController.document.get);
    router.get(cfg.privateSolutionSubmissionFilesURL + '/:filename', auth.isPermittedAccessToSolutionSubmission, registrationController.document.get);
  }
  else {
    // This is for local development
    router.get(cfg.privateSolutionSubmissionFilesURL + '/:filename', auth.isPermittedAccessToSolutionSubmission, function (req, res) {
      var options = {
        root: cfg.privateFilesDir+'/',
        dotfiles: 'deny',
        headers: {
          'x-timestamp': Date.now(),
          'x-sent': true
        }
      };
      res.sendFile('/' + req.params.filename, options);
    });
  }

  //===========================================================================
  // User Product Manage Routes
  //===========================================================================
  router.get('/profile/:username/manage/capabilities/create', auth.isAuthenticated, accountController.manage.capabilityCreate.get);
  router.post('/profile/:username/manage/capabilities/create', auth.isAuthenticated, accountController.manage.capabilityCreate.post);
  router.get('/profile/:username/manage/capabilities/:id', auth.isAuthenticated, capabilityController.user.update.get);
  router.post('/profile/:username/manage/capabilities/:id', auth.isAuthenticated, capabilityController.user.update.post);
  router.post('/capabilitiesUpdate/:id', auth.isAuthenticated, capabilityController.org.update.post);
  router.post('/newCapability', auth.isAuthenticated, capabilityController.user.list.post);
  router.post('/deleteCapability/:id', auth.isAuthenticated, capabilityController.user.delete.post);
  router.get('/profile/:username/manage/capabilities/:id/delete', auth.isAuthenticated, capabilityController.user.delete.get);
  router.post('/profile/:username/manage/capabilities/:id/delete', auth.isAuthenticated, capabilityController.user.delete.post);

  if (cfg.useS3) {
    router.get('/images/products/:filename', auth.allowAnonymousUser, capabilityController.user.image.get);
  }

  router.get('/avatar_upload', function (req, res, next) {
    res.render('account/avatar_uploader');
  });

  router.get('/conversations', auth.isAuthenticated, function(req, res){
    if (cfg.chat.enabled || res.locals.userinfo.isAdmin) {
      var siteSettings = require('../models/siteSettings');
      siteSettings.getSetting('chatVersion', function (value) {
        res.render('chat/default', {chatVersion: value});
      });
    } else {
      next();
    }
  });

  // LH: This is for testing
  //router.get('/add-ism-organizations-to-gsm', auth.allowAnonymousUser, communityController.user.addIsmOrganizationsToGsm.get);

  return router;
};
