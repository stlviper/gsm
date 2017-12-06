var cfg = require('../config'),
  communityModel = require('../models/communities').model,
  organization = require('../models/organizations').model,
  mongoose = require('mongoose'),
  emailer = require('./emailer'),
  strings = require('../config/strings'),
  logger = require('./logger'),
  moment = require('moment-timezone'),
  fs = require('fs');


// Setting up Mongoose
//==================================================================================
try {
  mongoose.connect('mongodb://' + cfg.mongo.uri + '/' + cfg.mongo.db);
}
catch (err) {
  console.error("HERE!!!: " + JSON.stringify(err, null, 2));
}

notificationMethods = {
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
  ]

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

_processNewUserJoinCommunity();

