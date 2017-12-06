var CronJob = require('cron').CronJob,
  cfg = require('../config'),
  communityModel = require('../models/communities').model,
  accountModel = require('../models/accounts').model,
  accountRoles = require('../models/accounts').roles,
  organization = require('../models/organizations').model,
  capabilitiesModel = require('../models/products').model,
  emailer = require('./emailer'),
  logger = require('./logger'),
  strings = require('../config/strings'),
  stringHelpers = require('../utils/stringHelpers'),
  async = require('async'),
  moment = require('moment'),
  fs = require('fs'),
  siteSettings = require('../models/siteSettings');

/*
 * Notes:
 *
 *  * * * * * *
 *  | | | | | |
 *  | | | | | +-- Year              (range: 1900-3000)
 *  | | | | +---- Day of the Week   (range: 1-7, 1 standing for Monday)
 *  | | | +------ Month of the Year (range: 1-12)
 *  | | +-------- Day of the Month  (range: 1-31)
 *  | +---------- Hour              (range: 0-23)
 *  +------------ Minute            (range: 0-59)
 *
 */


var notificationMethods = {
  OrganizationOfNewUser: function (accountDoc) {
    /**
     * Lets the proper member of the organization(org manager or SAM POC) know
     * a new user has been created they need to approve
     * @accountDoc the mongoose object representing the document
     */
    organization.findOne({'_id': accountDoc.orgRef}, function (err, orgDoc) {
      if (!orgDoc) {
        logger.error({message: 'Cannot find an organization to notifiy'});
      }
      else {
        accountModel.find({
          'approved': true, 'orgRef': accountDoc.orgRef, 'roles': accountRoles.OrgManager
        }, function (err, orgAccountDocs) {
          var toEmailAddress = null;
          var dearPpl = null;
          if (err) {
            logger.error(err);
          }
          else if (orgAccountDocs.length == 0) {
            toEmailAddress = orgDoc.businessPocEmail;
            dearPpl = orgDoc.businessPocFirstName + ' ' + orgDoc.businessPocLastName
          }
          else {
            var orgManagerEmails = [];
            var orgManagerNames = [];
            for (var idx in orgAccountDocs) {
              var managerDoc = orgAccountDocs[idx];
              if (managerDoc.email) {
                orgManagerEmails.push(managerDoc.email);
              }
              if (managerDoc.firstName && managerDoc.lastName) {
                var name = managerDoc.firstName + ' ' + managerDoc.lastName;
                orgManagerNames.push(name);
              }
            }
            toEmailAddress = orgManagerEmails.join(';');
            dearPpl = orgManagerNames.join(', ').trim();
          }

          var approvalUrl = cfg.externalHostname + '/join/pocapprove/' + accountDoc._id;
          emailer.sendEmail({
            from: cfg.helpDeskEmail,
            to: toEmailAddress,
            subject: strings.Emails.pocVerifyNewUserJoin.subject,
            text: stringHelpers.format(strings.Emails.pocVerifyNewUserJoin.text,
              dearPpl,
              approvalUrl,
              accountDoc.firstName + ' ' + accountDoc.lastName,
              accountDoc.email,
              accountDoc.phoneNumber
            )
          });
        });
      }
    });
  },
  OrganizationOfActivity: function (orgRef, subject, message, html) {
    /**
     * Lets the organization know something has occurred that may need their attention.
     * @orgRef The orgID
     * @subject Email subject
     * @message text representation of the message
     */
    organization.findOne({'_id': orgRef}, function (err, orgDoc) {
      if (!orgDoc) {
        logger.error({message: 'Cannot find an organization to notifiy'});
      }
      else {
        accountModel.find({
          'verifiedAccount': true,
          'orgRef': orgRef,
          'roles': accountRoles.OrgManager
        }, function (err, orgAccountDocs) {
          var toEmailAddress = null;
          if (err) {
            logger.error(err);
          }
          /*if (orgAccountDocs.length <= 0) {
           toEmailAddress = orgDoc.businessPocEmail;
           }*/
          else {
            var orgManagerEmails = [];
            for (var idx in orgAccountDocs) {
              if (orgAccountDocs[idx].email) {
                orgManagerEmails.push(orgAccountDocs[idx].email);
              }
            }
            toEmailAddress = orgManagerEmails.join(';');
          }
          emailer.sendEmail({
            from: cfg.helpDeskEmail,
            to: toEmailAddress,
            subject: subject,
            text: message,
            html: html
          });
        });
      }
    });
  },
  Registration: function (commDoc, newRegObj, problemDoc, userName, userEmail) {
    /**
     * Lets the organization know something has occurred that may need their attention.
     * @orgRef The orgID
     * @subject Email subject
     * @message text representation of the message
     */

    organization.findOne({'_id': newRegObj.orgRef}, function (err, orgDoc) {
      if (!orgDoc) {
        logger.error({message: 'Cannot find an organization to notifiy'});
      }
      else {
        var message = 'You have a new solution submission for your problem! You can view this solution by navigating to your Dashboard, then My Problems, then Solutions.\n\n' +
          'Problem: '
          + problemDoc.name + '\n\n' +
          'Organization: '
          + orgDoc.orgName + '\n\n' +
          'Regards,\n' +
          'The GSM Team\n' +
          'helpdesk@jivango.com\n' +
          'https://gsm.community.com';
        var subject = orgDoc.orgName + ' has submitted a solution to your problem in GSM';
        var html = '';
        accountModel.find({_id: {$in: problemDoc.discoveryEvaluators}}, function (err, orgEvalDocs) {
          accountModel.find({_id: {$in: problemDoc.discoveryManagers}}, function (err, orgManagerDocs) {
            var toEmailAddress = null;
            if (err) {
              logger.error(err);
            }
            else {
              var orgManagerEmails = [];
              for (var idx in orgEvalDocs) {
                if (orgEvalDocs[idx].email) {
                  orgManagerEmails.push(orgEvalDocs[idx].email);
                }
              }
              for (var idx in orgManagerDocs) {
                if (orgManagerDocs[idx].email) {
                  orgManagerEmails.push(orgManagerDocs[idx].email);
                }
              }
              toEmailAddress = orgManagerEmails.join(';');
            }
            emailer.sendEmail({
              from: cfg.helpDeskEmail,
              to: toEmailAddress,
              subject: subject,
              text: message,
              html: html
            });
            emailer.sendEmail({
              from: cfg.helpDeskEmail,
              to: userEmail,
              subject: stringHelpers.format(strings.Emails.registerConfirmation.subject, userName, newRegObj.challengeName),
              text: stringHelpers.format(strings.Emails.registerConfirmation.text, userName, newRegObj.challengeName),
              html: stringHelpers.format(strings.Emails.registerConfirmation.html, userName, newRegObj.challengeName)
            });
          });
        });
      }
    });
  },
  HelpDeskOfError: function (subject, message, error) {
    /**
     * Sends a notification to the help desk(set in the config file) that something has happened in the system
     * @subject What has happened
     * @message More detailed information about the issue
     * @error the actual error that was produced
     */
    emailer.sendEmail({
      from: cfg.helpDeskEmail,
      to: cfg.helpDeskEmail,
      subject: subject,
      text: stringHelpers.format('{0} \n {1}', message, error)
    });
  },
  HelpDesk: function (subject, message, html) {
    emailer.sendEmail({
      from: cfg.helpDeskEmail,
      to: cfg.helpDeskEmail,
      subject: subject,
      text: message,
      html: html
    });
  },
  UserOfActivity: function (accountDoc, subject, message, html) {
    /**
     * Lets the user know something has been done with their account.
     * @accountDoc The mongo document representing the user
     * @subject Email subject
     * @message text representation of the message
     * @html html markup of the message
     */
    emailer.sendEmail({
      from: cfg.helpDeskEmail,
      to: accountDoc.email,
      subject: subject,
      text: message,
      html: html
    });
  },
  UserOfApproval: function (accountDoc, resetUrl) {
    /**
     * Notifies the user their account has been approved.
     * @accountDoc The mongo document representing the user
     * @resetUrl Url the user will use to reset their password
     */
    var userDisplayName = accountDoc.username;
    if (accountDoc.firstName && accountDoc.lastName) {
      userDisplayName = accountDoc.firstName + ' ' + accountDoc.lastName;
    }
    var text = stringHelpers.format(strings.Emails.userAdminApproved.text, userDisplayName, resetUrl);
    var html = stringHelpers.format(strings.Emails.userAdminApproved.html, userDisplayName, resetUrl);
    emailer.sendEmail({
      from: cfg.helpDeskEmail,
      to: accountDoc.email,
      subject: strings.Emails.userAdminApproved.subject,
      text: text,
      html: html
    });
  },
  UserOfDenial: function (accountDoc) {
    var userDisplayName = accountDoc.username;
    if (accountDoc.firstName && accountDoc.lastName) {
      userDisplayName = accountDoc.firstName + ' ' + accountDoc.lastName;
    }
    var text = stringHelpers.format(strings.Emails.userAdminDenial.text, userDisplayName);
    var html = stringHelpers.format(strings.Emails.userAdminDenial.html, userDisplayName);
    emailer.sendEmail({
      from: cfg.helpDeskEmail,
      to: accountDoc.email,
      subject: strings.Emails.userAdminDenial.subject,
      text: text,
      html: html
    });
  },
  publishAlert: function (accountDoc, newsPostList, callback) {
    siteSettings.getSiteConfig(function(err, siteConfig) {
      if (!err) {
        var doNotEmailList = siteConfig.doNotEmailList;
        if (doNotEmailList.indexOf(accountDoc.email) < 0) {
          var userDisplayName = accountDoc.username;
          if (accountDoc.firstName && accountDoc.lastName) {
            userDisplayName = accountDoc.firstName + ' ' + accountDoc.lastName;
          }

          var newsLink = [];
          newsPostList.map(function (newsDoc) {
            var membersIDStr = [];
            newsDoc.members.map(function (memberID) {
              membersIDStr.push(memberID.toString());
            });
            if (membersIDStr.indexOf(accountDoc.orgRef.toString()) > -1) {
              newsLink.push(newsDoc.headline + ': ' + cfg.externalHostname + '/community/about/' + newsDoc.communityUrlFriendlyID + '/news/' + newsDoc.postUrlFriendlyID);
            }
          });

          if (newsLink.length > 0) {
            var text = stringHelpers.format(strings.Emails.newsPostAlert.text, userDisplayName, newsLink.join('\n'));
            var html = stringHelpers.format(strings.Emails.newsPostAlert.html, userDisplayName, newsLink.join('</br>'));
            emailer.sendEmail({
              from:    cfg.helpDeskEmail,
              to:      accountDoc.email,
              subject: strings.Emails.newsPostAlert.subject,
              text:    text,
              html:    html
            });
          }
        }
      }
      callback();
    });
  },
  JoinCommunityReminder: function (orgManagerEmail, subject, message, html) {
    /**
     * Reminde org manager to join a community.
     * @accountDoc The mongo document representing the user
     * @subject Email subject
     * @message text representation of the message
     * @html html markup of the message
     */
    fs.readFile('./email_templates/JIV-JoinCommunitiesEmail.html', 'utf8', function (err, html) {
      if (err) {
        logger.error({'message': err});
      } else {
        emailer.sendEmail({
          from: cfg.helpDeskEmail,
          to: orgManagerEmail,
          subject: subject,
          text: message,
          html: html
        });
      }
    });
  }
};

var _processError = function (err) {
  logger.error(err);
  logger.info({source: 'Notifier', message: 'An errored occured' + err.message});
};

var _processInfo = function (msg) {
  logger.info({
    source: 'Notifier',
    message: msg
  });
};

var _processAccountInfo = function (accountDoc) {
  var dayCount = [21, 14, 7, 3];
  var currentDate = moment();
  var accountCreateDate = moment(accountDoc.dateAdded);
  var diff = currentDate.tz(cfg.notifierTimeZone).diff(accountCreateDate.tz(cfg.notifierTimeZone), 'days');
  var username = accountDoc.username;
  if (accountDoc.firstName && accountDoc.lastName) {
    username = accountDoc.firstName + ' ' + accountDoc.lastName + ' (' + accountDoc.username + ')';
  }
  if (dayCount.indexOf(diff) > -1 && diff < 30) {
    organization.findOne({'_id': accountDoc.orgRef}, function (err, orgDoc) {
      if (err) {
        logger.error(err);
      }
      else if (!orgDoc) {
        logger.error({
          message: 'No organization can be found for ' + (accountDoc.username || accountDoc._id.toString())
        });
      }
      else if (orgDoc.businessPocEmail) {
        notificationMethods.OrganizationOfNewUser(accountDoc);
        notificationMethods.UserOfActivity(accountDoc,
          strings.Emails.waitingApprovalToUser.subject,
          stringHelpers.format(strings.Emails.waitingApprovalToUser.text, orgDoc.businessPocEmail),
          stringHelpers.format(strings.Emails.waitingApprovalToPOC.html, orgDoc.businessPocEmail)
        );
        logger.info({
          source: 'Notifier',
          message: ' Business POC notified of ' + diff + ' day pending account(' + username + ')'
        });
      }
    });
  }
  else if (diff >= 30) {

    logger.info({
      source: 'Notifier',
      message: ' Help Desk notified of ' + diff + ' day pending account(' + username + ')'
    });

    notificationMethods.HelpDesk(strings.Emails.morethenThirtyDayEmailToHelpDesk.subject,
      stringHelpers.format(strings.Emails.morethenThirtyDayEmailToHelpDesk.text, username, diff),
      stringHelpers.format(strings.Emails.morethenThirtyDayEmailToHelpDesk.html, username, diff));
    notificationMethods.UserOfActivity(accountDoc,
      strings.Emails.morethenThirtyDayEmailToUser.subject,
      strings.Emails.morethenThirtyDayEmailToUser.text,
      strings.Emails.morethenThirtyDayEmailToUser.html
    );
  }
};

var _processNewsPost = function () {
  var query = [
    {'$unwind': '$news'},
    {
      '$project': {
        'members': '$members',
        'communityUrlFriendlyID': '$urlFriendlyID',
        'postUrlFriendlyID': '$news.urlFriendlyID',
        'headline': '$news.headline',
        'releaseDate': '$news.releaseDate',
        'canRelease': {
          '$and': [
            {'$lte': ['$news.releaseDate', new Date(Date.now())]},
            {'$ne': ['$news.notificationSent', true]}
          ]
        }
      }
    },
    {'$match': {'canRelease': true}}
  ];
  communityModel.aggregate(query, function (err, newsDocs) {
    accountModel.find({'approved': true}, function (err, accountDocs) {
      accountDocs.map(function (accountDoc) {
        notificationMethods.publishAlert(accountDoc, newsDocs, function () {
          communityModel.find({'news': {$exists: true, $not: {$size: 0}}}, function (err, communityDocs) {
            communityDocs.map(function (communityDoc) {
              communityDoc.news.map(function (newsDoc) {
                if (newsDoc.releaseDate <= new Date(Date.now()) && !newsDoc.notificationSent) {
                  newsDoc.notificationSent = true;
                  communityDoc.save();
                }
              });
            });
          });
        });
      });
    });
  });

};

var _processNewUserJoinCommunity = function () {

  var orgs = [];
  var communityQuery = [
    {'$unwind': '$members'},
    {
      '$lookup': {
        'from': 'organizations',
        'localField': 'members',
        'foreignField': '_id',
        'as': 'org'
      }
    }
  ];
  var orgQuery = [
    {
      '$lookup': {
        'from': 'accounts',
        'localField': '_id',
        'foreignField': 'orgRef',
        'as': 'users'
      }
    },
    {'$unwind': '$users'},
    {
      '$match': {
        '_id': {
          '$nin': orgs
        },
        'users.roles': {'$elemMatch': {'$eq': 'organizationManager'}}
      }
    }
  ];
  communityModel.aggregate(communityQuery, function (err, communityDocs) {
    if (err) {
      logger.error({message: err});
    } else {
      if (communityDocs.length > 0) {
        for (var i = 0; i < communityDocs.length; i++) {
          var commOrg = (communityDocs[i].org[0]) ? communityDocs[i].org[0] : communityDocs[i].org;
          orgs.push(commOrg._id);
        }
      }

      organization.aggregate(orgQuery, function (err, orgDocs) {
        if (err) {
          logger.error({message: err});
        } else {
          for (var i = 0; i < orgDocs.length; i++) {

            var org = orgDocs[i];
            var dayCount = [/*7,*/ 1];
            var currentDate = moment();
            var orgCreateDate = moment(Date.parse(org.dateCreated));
            var diffInDays = currentDate.tz(cfg.notifierTimeZone).diff(orgCreateDate.tz(cfg.notifierTimeZone), 'days');
            //console.log(diffInDays);
            if (/*dayCount.indexOf(diffInDays) > -1 &&*/
            org.approved &&
            (org.newMemberJoinCommunityLastReminderDay == undefined || org.newMemberJoinCommunityLastReminderDay == null)
            ) {

              notificationMethods.JoinCommunityReminder(org.users.email,
                  strings.Emails.joinCommunityReminder.subject,
                  strings.Emails.joinCommunityReminder.text,
                  strings.Emails.joinCommunityReminder.html
              );
              logger.info({
                source: 'Notifier',
                message: 'Organization Manager ' + org.users.firstName + ' ' + org.users.lastName + ' of ' + org.orgName + ' reminded to join a community after ' + diffInDays + ' day(s)'
              });
              organization.update({'_id': org._id}, { $set: {newMemberJoinCommunityLastReminderDay: moment()}}, function(err) {
                if(err) {
                  logger.error(err);
                } else {
                  logger.info({
                    source: 'Notifier',
                    message: 'Flagged organization ' + org.orgName + ' as being notified to join a community.'
                  })
                }
              });

            }
          }
        }
      });
    }
  });
};

/***********************************************************************************************************************
 * This function will notify the organization managers for NGA and USGIF at 7 AM the day after a new organization signs
 * up in the GSM platform. This is NOT a general notifier; i.e. it will only notify NGA and USGIF organization
 * managers.
 **********************************************************************************************************************/
var _processNotifyOfNewOrganization = function () {
  var emailTimeToday = new Date();
  var emailTimePrevious = new Date();
  emailTimePrevious.setHours(7, 0, 0, 0); // 7 AM
  emailTimePrevious.setDate(emailTimeToday.getDate() - 3); // Look back 3 days over the course of a weekend; The reason
                                                           // this is used is so all the pre-existing organizations don't
                                                           // trigger emails and b/c the cron job only runs M-F

  // Find all organizations with the field added to the schema and whose value
  // indicates a message has not been sent
  var organizationsQuery = {
    $and: [
      {'dateCreated': {$gt: emailTimePrevious}},
      {'newOrganizationLastNotificationDay': {$exists: false}}
    ]
  };
  organization.find(organizationsQuery, function (findErr, organizationDocuments) {
    if (findErr) {
      logger.error(findErr);
    }
    else if (organizationDocuments.length < 1) {

    }
    else {
      // Find the organization managers for NGA and USGIF
      var organizationManagersToNotifyQuery = [
        {
          '$match': {
            $or: [
              {'urlFriendlyID': 'nga'},
              {'urlFriendlyID': 'united-states-geospatial-intelligence-foundation'}
            ]
          }
        },
        {
          '$lookup': {
            'from': 'accounts',
            'localField': '_id',
            'foreignField': 'orgRef',
            'as': 'users'
          }
        },
        {'$unwind': '$users'},
        {
          '$match': {
            'users.roles': {'$elemMatch': {'$eq': 'organizationManager'}}
          }
        }
      ];

      organization.aggregate(organizationManagersToNotifyQuery, function (findErr, organizationDocuments2) {
        if (findErr) {
          logger.error(findErr);
        }
        else {
          for (var idx in organizationDocuments) {
            // Loop through organization managers and send them an email for each new organization
            for (var idx2 in organizationDocuments2) {
              var subject = 'New GSM Member - ' + organizationDocuments[idx].orgName;
              var text = 'Hi ' + organizationDocuments2[idx2].users.firstName + ',\n\n' +
                organizationDocuments[idx].orgName + ' has just joined GSM.\n\nYou can view their ' +
                'Organization Profile here: ' + cfg.externalHostname + '/members/' + organizationDocuments[idx].urlFriendlyID +
                '\n\nRegards,\n\nThe GSM Helpdesk\n' + cfg.helpDeskEmail;
              emailer.sendEmail({
                from: cfg.helpDeskEmail,
                to: organizationDocuments2[idx2].users.email,
                subject: subject,
                text: text,
                html: ''
              });
              organization.update({'_id': organizationDocuments[idx]._id}, {$set: {newOrganizationLastNotificationDay: moment()}}, function (err) {
                if (err) {
                  logger.error(err);
                } else {
                  logger.info({
                    source: 'Notifier',
                    message: 'Flagged organization ' + organizationDocuments[idx].orgName + ' as being sent to NGA and USGIF as a new member.'
                  });
                }
              });
            }
          }
        }
      });
    }
  });
};

/***********************************************************************************************************************
 * This function will notify all users of new capabilities posted the previous day.
 **********************************************************************************************************************/
_processNotifyOfNewCapabilities = function () {

  siteSettings.getSiteConfig(function(err, siteConfig) {
    if (!err) {
      var emailTimeToday    = new Date();
      var emailTimePrevious = new Date();
      emailTimePrevious.setHours(7, 0, 0, 0); // 7 AM
      emailTimePrevious.setDate(emailTimeToday.getDate() - 3); // Look back 3 days over the course of a weekend; The reason
                                                               // this is used is so all the pre-existing capabilities don't
                                                               // trigger emails and b/c the cron job only runs M-F

      // Find all organizations with the field added to the schema and whose value
      // indicates a message has not been sent
      var capabilitiesQuery = [
        {
          $match: {
            $and: [
              {'date_created': {$gt: emailTimePrevious}},
              {'newCapabilityLastNotificationDay': {$exists: false}}
            ]
          }
        },
        // Join the owning organizations so their information can be displayed
        {
          $lookup: {
            "from":         "organizations",
            "localField":   "orgRef",
            "foreignField": "_id",
            "as":           "organization"
          }
        },
        // Unwind based on the organization field so that it no longer needs to be referenced as an array
        {
          $unwind: "$organization"
        }
      ];
      capabilitiesModel.aggregate(capabilitiesQuery, function (findErr, capabilitiesDocuments) {
        if (findErr) {
          logger.error(findErr);
        }
        else if (capabilitiesDocuments.length < 1) {
          // Do nothing; No new capabilities were submitted
        }
        else {
          accountModel.find({}, function (findErr, accountDocuments) {
            for (var idxCapabilities in capabilitiesDocuments) {
              var doNotEmailList = siteConfig.doNotEmailList;
              for (var idxAccounts in accountDocuments) {
                if (doNotEmailList.indexOf(accountDocuments[idxAccounts].email) < 0) {
                  var subject = 'New GSM Capability - ' + capabilitiesDocuments[idxCapabilities].name;
                  var text    = 'Hi ' + accountDocuments[idxAccounts].firstName + ',\n\n' + capabilitiesDocuments[idxCapabilities].organization.orgName + ' has just added "' +
                    capabilitiesDocuments[idxCapabilities].name + '" to the Capability Catalog on the GEOINT Solutions Marketplace.\n\nYou can view the capability ' +
                    'here to find out more information about it or ask a question: ' + cfg.externalHostname + '/capabilities/' + capabilitiesDocuments[idxCapabilities].urlFriendlyID +
                    '\n\nRegards,\n\nThe GSM Helpdesk\n' + cfg.helpDeskEmail + '\n' + cfg.externalHostname;
                  emailer.sendEmail({
                    from:    cfg.helpDeskEmail,
                    to:      accountDocuments[idxAccounts].email,
                    subject: subject,
                    text:    text,
                    html:    ''
                  });
                }
              }
              capabilitiesModel.update({'_id': capabilitiesDocuments[idxCapabilities]._id}, {$set: {newCapabilityLastNotificationDay: moment()}}, function (err) {
                if (err) {
                  logger.error(err);
                } else {
                  logger.info({
                    source:  'Notifier',
                    message: 'Flagged capability ' + capabilitiesDocuments[idxCapabilities].name + ' as being sent to all users as a new capability.'
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

var _cronStart = function () {
  var tasks = [
    function () {
      logger.info({source: 'Notifier', message: 'Started User Activity notification task'});
      var currentTime = moment();
      accountModel.find({'approved': false}, function (err, accountDocs) {
        if (err) {
          _processError(err);
        }
        else if (accountDocs && accountDocs.length > 0) {
          _processInfo('No account(s) to process on ' + currentTime.tz(cfg.notifierTimeZone).format('MMMM Do YYYY, h:mm:ss a') + ' EST');
        }
        else {
          accountDocs.map(_processAccountInfo);
        }
      });
    },
    function () {
      logger.info({source: 'Notifer', message: 'Started News Post notification task'});
      _processNewsPost();
    },
    function () {
      logger.info({source: 'Notifer', message: 'Started new user to join community reminder task'});
      _processNewUserJoinCommunity();
    },
    function () {
      logger.info({source: 'Notifer', message: 'Started check for new organization notifications task'});
      _processNotifyOfNewOrganization();
    },
    function () {
      logger.info({source: 'Notifer', message: 'Started check for new capabilities notifications task'});
      _processNotifyOfNewCapabilities();
    }
  ];

  async.parallel(tasks, function (err) {
    logger.info({source: 'Notifier', message: "Finished notification tasks"});
    if (err) {
      logger.error(err);
    }
  });
};

var _cronFinish = function () {
  logger.info({message: 'Notifier has finished running'});
};

var notifier = null;
if (cfg.enableNotifier) {
  notifier = new CronJob({
    cronTime: cfg.notifierSchedule,
    onTick: _cronStart,
    onComplete: _cronFinish,
    startNow: true,
    timeZone: cfg.notifierTimeZone
  });
}

module.exports = {
  cron: notifier,//NOTE: To start the cron job the call will have to call start on it. exports.cron.start()
  notifyOrganizationOfNewUser: notificationMethods.OrganizationOfNewUser,
  notifyOrganizationOfActivity: notificationMethods.OrganizationOfActivity,
  notifyUserOfActivity: notificationMethods.UserOfActivity,
  notifyHelpDeskOfError: notificationMethods.HelpDeskOfError,
  notifyUserOfApproval: notificationMethods.UserOfApproval,
  notifyUserOfDenial: notificationMethods.UserOfDenial,
  notifyHelpDesk: notificationMethods.HelpDesk,
  notifyRegistration: notificationMethods.Registration
};