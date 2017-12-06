var cfg = require('../config'),
  async = require('async'),
  strings = require('../config/strings'),
  stringHelpers = require('../utils/stringHelpers'),
  community = require('../models/communities'),
  problem = require('../models/challenges'),
  problemModel = problem.model,
  communityModel = community.model,
  addNewsPost = community.addNewsPost,
  accountModel = require('../models/accounts').model,
  accountRoles = require('../models/accounts').roles,
  organizationController = require('./organization'),
  organizationModel = require('../models/organizations').model,
  organizationRoles = require('../models/organizations').roles,
  capabilityModel = require('../models/products').model,
  objectTools = require('../utils/objectTools'),
  orgRoles = require('../models/organizations').roles,
  httpStatus = require('http-status'),
  logger = require('../utils/logger'),
  docHlpr = require('../utils/documentHelper'),
  path = require('path'),
  notifier = require('../utils/notifier'),
  validateProblemSubmissionFields = require('../utils/validation').validateProblemSubmissionFields,
  sanitizeHtml = require("sanitize-html");

communityController = {user: {}, admin: {}};

var _anonyCommunities = function (req, res) {
  communityModel.find({approved: true}, function (findErr, communityDocs) {

    if (findErr) {
      res.render('error', {message: 'Cannot process your request at this time.', error: findErr});
    }
    else {
      var orgRefs = [];
      for (var idx in communityDocs) {
        orgRefs.push(communityDocs[idx].owner.toString());
      }
      organizationModel.find({_id: {$in: orgRefs}}, function (orgErr, orgDocs) {
        _gatherMetricCallsOn(communityDocs, function (err, calls) {
          async.parallel(calls, function (err, result) {
            res.render('community/user-default', {
              title: 'Communities',
              communities: communityDocs,
              organizations: orgDocs || []
            });
          });
        });
      });
    }
  });
};

var _authenticatedUser = function (req, res) {
  var userOrgRef = res.locals.userinfo.orgRef;
  communityModel.find({approved: true, $or: [{members: {$in: [userOrgRef]}}, {owner: userOrgRef}]},
    function (findErr, myCommunityDocs) {
      communityModel.find({approved: true, $and: [{members: {$nin: [userOrgRef]}}, {owner: {$nin: [userOrgRef]}}]},
        function (findErr, communityDocs) {
          if (findErr) {
            res.render('error', {message: 'Cannot process your request at this time.', error: findErr});
          }
          else {
            var orgRefs = [];
            for (var idx in communityDocs) {
              orgRefs.push(communityDocs[idx].owner.toString());
            }
            for (var myIdx in myCommunityDocs) {
              orgRefs.push(myCommunityDocs[myIdx].owner.toString());
            }
            organizationModel.find({_id: {$in: orgRefs}}, function (err, orgDocs) {
              var allDocs = [];
              for (var i in myCommunityDocs) {
                allDocs.push(myCommunityDocs[i]);
              }
              for (var i2 in communityDocs) {
                allDocs.push(communityDocs[i2]);
              }
              _gatherMetricCallsOn(allDocs, function (err, calls) {
                async.parallel(calls, function (err, results) {
                  res.render('community/user-default', {
                    title: 'Communities',
                    myCommunities: myCommunityDocs || [],
                    communities: communityDocs || [],
                    organizations: orgDocs || []
                  });
                });
              });
            });
          }
        });
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

var _gatherMetricCallsOn = function (communities, callback) {
  var calls = [];
  communities.forEach(function (y) {
    calls.push(function (callback) {
      _getCapabilityCount(y, function () {
        callback(null);
      });
    });
    calls.push(function (callback) {
      _getProblemCount(y, function () {
        callback(null);
      });
    });
  });

  callback(null, calls);
};

var _saveDataUrl = docHlpr.saveDataUrl;

var _getNewsViewData = function (req, res, includeTopNewsStories, includeTopCategoires, callback) {
  var calls = {
    newsArticle: function (callback) {
        helperFunctions.getNewsStory(req.params.newsRouteID, res.locals.geoIntCommunityUrlFriendlyId, function (err, results) {
            
        callback(null, results[0] ? results[0].news : {});
      });
    }
  };
  if (includeTopCategoires) {
    calls.newsTopCategories = function (callback) {
      try {
        helperFunctions.getTopNewsCategories(res.locals.geoIntCommunityUrlFriendlyId, function (err, results) {
          callback(null, results);
        });
      }
      catch (e) {
        logger.error(e);
        callback({'topNewsCategories': []});
      }
    };
  }
  if (includeTopNewsStories) {
    calls.newsTopStories = function (callback) {
      try {
        helperFunctions.getTopNewsStory(res.locals.geoIntCommunityUrlFriendlyId, function (err, results) {
          callback(null, results);
        });
      }
      catch (e) {
        logger.error(e);
        callback(null, []);
      }
    };
  }

  async.parallel(calls, function (err, results) {
    callback(err, results);
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

communityController.user.default = {
  get: function (req, res) {
    if (res.locals.userinfo) {
      _authenticatedUser(req, res);
    }
    else {
      _anonyCommunities(req, res);
    }
  },
  post: function (req, res) {
    res.render('inprogress');
  }
};

var searchingFieldsOfInterest = {
  _id: 1,
  name: 1,
  categories: 1,
  logoUrl: 1,
  description: 1,
  urlFriendlyID: 1,
  owner: 1,
  members: 1
};
communityController.user.search = {

  get: function (req, res) {

    var query = [];
    query.push({approved: true});
    if (req.query.name) {
      query.push({name: new RegExp(req.query.name + '.*', 'i')});
    }

    communityModel.find({$and: query}, searchingFieldsOfInterest)
      .sort({name: 1}).exec(function (err, comDocs) {
        if (err) {
          return res.render('searchresults', {error: 'The search failed. Please try again.'});
        }
        else if (comDocs.length === 0) {
          return res.render('searchresults', {message: 'No communities were found for the given search criteria.'});
        } else {
          var ownersArr = [];
          for (var i in comDocs) {
            if (typeof comDocs[i].logoUrl === 'undefined') {
              ownersArr.push({_id: comDocs[i].owner});
            }
          }
          organizationModel.find({$or: ownersArr}, function (err, orgDocs) {
            if (err) {
              return res.render('searchresults', {error: 'The search failed. Please try again.'})
            } else if (orgDocs) {
              for (var i in comDocs) {
                if (typeof comDocs[i].logoUrl === 'undefined') {
                  for (var j in orgDocs) {
                    if (JSON.stringify(comDocs[i].owner) === JSON.stringify(orgDocs[j].id)) {
                      comDocs[i].logoUrl = orgDocs[j].logoUrl;
                      break;
                    }
                  }
                }
              }
            }
          });
          return res.render('searchresults', {communities: comDocs, message: 'One or more communities were found.'});
        }
      });
  },

  post: function (req, res) {

    var query = [];
    query.push({approved: true});
    if (req.body.categories) {
      query.push({categories: {$in: req.body.categories.split(',')}});
    }
    if (req.body.name) {
      query.push({name: new RegExp(req.body.name + '.*', 'i')});
    }
    if (req.body.allcommunities) {
      communityModel.find({$and: query}, searchingFieldsOfInterest)
        .sort({name: 1}).exec(function (err, comDocs) {
          if (err) {
            return res.render('searchresults', {
              checkbox: 'allcommunities',
              categories: req.body.categories,
              error: 'The search failed. Please try again.'
            });
          }
          else if (comDocs.length === 0) {
            return res.render('searchresults', {
              checkbox: 'allcommunities',
              categories: req.body.categories,
              message: 'No communities were found for the given search criteria.'
            });
          }
          else {
            var ownersArr = [];
            for (var i in comDocs) {
              if (typeof comDocs[i].logoUrl === 'undefined') {
                ownersArr.push({_id: comDocs[i].owner});
              }
            }
            organizationModel.find({$or: ownersArr}, function (err, orgDocs) {
              if (err) {
                return res.render('searchresults', {error: 'The search failed. Please try again.'})
              } else if (orgDocs) {
                for (var i in comDocs) {
                  if (typeof comDocs[i].logoUrl === 'undefined') {
                    for (var j in orgDocs) {
                      if (JSON.stringify(comDocs[i].owner) === JSON.stringify(orgDocs[j].id)) {
                        comDocs[i].logoUrl = orgDocs[j].logoUrl;
                        break;
                      }
                    }
                  }
                }
              }
            });
            return res.render('searchresults', {
              communities: comDocs,
              checkbox: 'allcommunities',
              categories: req.body.categories,
              message: 'One or more communities were found.'
            });
          }
        });
    } else if (req.body.mycommunities) {
      // Get all the communties the organization owns or is a member of
      var queryOr = {$or: [{owner: res.locals.userinfo.orgRef}, {members: {$in: [res.locals.userinfo.orgRef]}}]};
      query.push(queryOr);
      communityModel.find({$and: query}, function (err, comDocs) {
        if (err) {
          return res.render('searchresults', {
            checkbox: 'mycommunities',
            categories: req.body.categories,
            error: 'The search failed. Please try again.'
          });
        } else if (comDocs.length === 0) {
          return res.render('searchresults', {
            checkbox: 'mycommunities',
            categories: req.body.categories,
            message: 'No communities were found for the given search criteria.'
          });
        } else {
          return res.render('searchresults', {
            communities: comDocs,
            checkbox: 'mycommunities',
            categories: req.body.categories,
            message: 'One or more communities were found.'
          });
        }
      });
    }
  }
};

// Admin
//====================================================
// Return all approved communities in the database
communityController.user.search.allApproved = {
  get: function (req, res) {
    communityModel.find({approved: true}, {_id: 1, name: 1})
      .sort({name: 1}).exec(function (err, comDocs) {
        if (err) {
          logger.error(err);
          res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Error: The search failed. Please try again."});
        } else if (comDocs.length !== 0) {
          res.status(httpStatus.OK).json(comDocs);
        } else if (comDocs.length === 0) {
          res.status(httpStatus.OK).json(null);
        }
      })
  }
};

communityController.user.categories = {
  get: function (req, res) {
  }
};

communityController.user.join = {
  post: function (req, res) {
    if (req.body.id) {

      var orgRef = res.locals.userinfo.orgRef;
      communityModel.findOne({_id: req.body.id}, function (findErr, doc) {
        organizationModel.findOne({_id: doc.owner}, function (err, orgDoc) {
          var idx = res.locals.userinfo.email.lastIndexOf('@');
          if (doc.type === 'private') {
            if (idx > -1 && res.locals.userinfo.email.slice(idx) === doc.emailDomain) {
              if (doc) {
                capabilityModel.find({orgRef: orgRef, approved: true}, function (findErr, capabilityDoc) {

                  var orgRef = res.locals.userinfo.orgRef;

                  if (!doc.solutions) {
                    doc.solutions = [];
                  }
                  for (var i = 0; i < capabilityDoc.length; i++) {
                    if (doc.solutions.indexOf(capabilityDoc[i]._id) === -1) {
                      doc.solutions.push(capabilityDoc[i]._id);
                    }
                  }


                  if (!doc.members) {
                    doc.members = [];
                  }
                  if (doc.members.indexOf(orgRef) === -1) {
                    doc.members.push(orgRef);
                  }

                  doc.save(function (saveErr) {
                    if (saveErr) {
                      logger.error(saveErr);
                      res.status(httpStatus.INTERNAL_SERVER_ERROR)
                        .json({message: 'Cannot process your request as this time'});
                    }
                    else {

                      var logoUrl = doc.logoUrl;
                      if (!logoUrl || (logoUrl && logoUrl.length <= 0)) {
                        logoUrl = orgDoc.logoUrl;
                      }
                      res.status(httpStatus.ACCEPTED)
                        .json({
                          message: 'Successful',
                          id: doc.id,
                          urlFriendlyID: doc.urlFriendlyID,
                          name: doc.name,
                          news: doc.news.length,
                          solutions: doc.solutions.length,
                          discoveries: doc.discoveries.length,
                          members: doc.members.length,
                          logoUrl: logoUrl
                        });

                    }
                  });

                });
              }
              else {
                res.status(httpStatus.BAD_REQUEST)
                  .json({message: 'No community matches the given id'});
              }
            } else {
              res.status(httpStatus.BAD_REQUEST)
                .json({message: '<p>You do not meet the requirements to join this private community. Please contact the <a href=/contact>GSM Helpdesk</a>.</p>'});
            }
          } else {
            capabilityModel.find({orgRef: orgRef, approved: true}, function (findErr, capabilityDoc) {

              var orgRef = res.locals.userinfo.orgRef;

              if (!doc.solutions) {
                doc.solutions = [];
              }
              for (var i = 0; i < capabilityDoc.length; i++) {
                if (doc.solutions.indexOf(capabilityDoc[i]._id) === -1) {
                  doc.solutions.push(capabilityDoc[i]._id);
                }
              }


              if (!doc.members) {
                doc.members = [];
              }
              if (doc.members.indexOf(orgRef) === -1) {
                doc.members.push(orgRef);
              }

              doc.save(function (saveErr) {
                if (saveErr) {
                  logger.error(saveErr);
                  res.status(httpStatus.INTERNAL_SERVER_ERROR)
                    .json({message: 'Cannot process your request as this time'});
                }
                else {

                  var logoUrl = doc.logoUrl;
                  if (!logoUrl || (logoUrl && logoUrl.length <= 0)) {
                    logoUrl = orgDoc.logoUrl;
                  }
                  res.status(httpStatus.ACCEPTED)
                    .json({
                      message: 'Successful',
                      id: doc.id,
                      urlFriendlyID: doc.urlFriendlyID,
                      name: doc.name,
                      news: doc.news.length,
                      solutions: doc.solutions.length,
                      discoveries: doc.discoveries.length,
                      members: doc.members.length,
                      logoUrl: logoUrl
                    });

                }
              });

            });
          }
        });
      });
      //end
    }
    else {
      res.status(httpStatus.BAD_REQUEST)
        .json({message: 'Please include an ID of the community you wish to join'});
    }
  }
};

communityController.user.leave = {
  post: function (req, res) {
    if (req.body.id) {
      communityModel.findOne({_id: req.body.id}, function (findErr, doc) {
        capabilityModel.find({orgRef: res.locals.userinfo.orgRef}, function (err, capabilityDoc) {
          if (doc) {
            var orgRef = res.locals.userinfo.orgRef;
            var memberIdx = doc.members.indexOf(orgRef);
            for (var i = 0; i < capabilityDoc.length; i++) {
              var capabilityIdx = doc.solutions.indexOf(capabilityDoc[i]._id);
              if (capabilityIdx > -1) {
                doc.solutions.splice(capabilityIdx, 1);
              }
            }

            if (memberIdx > -1) {
              doc.members.splice(memberIdx, 1);
            }
            doc.save(function (saveErr) {
              if (saveErr) {
                logger.error(saveErr);
                res.status(httpStatus.INTERNAL_SERVER_ERROR)
                  .json({message: 'Cannot process your request as this time'});
              }
              else {
                organizationModel.findOne({_id: doc.owner}, function (err, orgDoc) {
                  var logoUrl = doc.logoUrl;
                  if (!logoUrl || (logoUrl && logoUrl.length <= 0)) {
                    logoUrl = orgDoc.logoUrl;
                  }
                  res.status(httpStatus.ACCEPTED)
                    .json({
                      message: 'Successful',
                      id: doc.id,
                      urlFriendlyID: doc.urlFriendlyID,
                      name: doc.name,
                      news: doc.news.length,
                      solutions: doc.solutions.length,
                      discoveries: doc.discoveries.length,
                      members: doc.members.length,
                      logoUrl: logoUrl
                    });
                });
              }
            });
          }
          else {
            res.status(httpStatus.BAD_REQUEST)
              .json({message: 'No community matches the given id'});
          }
        });
      });
    }
    else {
      res.status(httpStatus.BAD_REQUEST)
        .json({message: 'Please include an ID of the community you wish to leave'});
    }
  }
};

communityController.user.create = {
  post: function (req, res) {
    if (req.body.community_description && req.body.community_name) {
      var newCommunity = {
        name: req.body.community_name,
        description: req.body.community_description,
        owner: res.locals.userinfo.orgRef,
        members: res.locals.userinfo.orgRef
      };
      community.creator(newCommunity, function (err, communityDoc) {
        if (err) {
          logger.error(err);

        }
        else {
          var userinfo = res.locals.userinfo;
          var username = userinfo.username;
          if (userinfo.firstName && userinfo.lastName) {
            username = stringHelpers.format('{1} {2}({0})', userinfo.username, userinfo.firstName, userinfo.lastName);
          }
          notifier.notifyHelpDesk(
            strings.Emails.newCommunityMessageHelpDesk.subject,
            stringHelpers.format(strings.Emails.newCommunityMessageHelpDesk.text, username, newCommunity.name, newCommunity.description),
            stringHelpers.format(strings.Emails.newCommunityMessageHelpDesk.html, username, newCommunity.name, newCommunity.description)
          );
          res.status(httpStatus.ACCEPTED)
            .json({message: strings.Community.Messages.CommunityCreation});
        }
      });
    }
    else {
      res.status(httpStatus.BAD_REQUEST).json({message: 'Please include the community name and description'});
    }
  }
};

communityController.user.update = {
  get: function (req, res) {
  },
  post: function (req, res) {
  }
};

communityController.user.delete = {
  get: function (req, res) {
  },
  post: function (req, res) {
  }
};

communityController.admin.list = {
  get: function (req, res) {
    communityModel.find({}, function (communityErr, communityDocs) {
      if (communityErr) {
        res.render('error', {message: 'Cannot process your request at this time', error: communityErr});
      }
      else {
        organizationModel.find({}, function (orgErr, orgDocs) {
          if (orgErr) {
            res.render('error', {message: 'Cannot process your request at this time', error: orgErr});
          }
          else {
            res.render('community/admin-list', {
              title: 'Communities',
              communities: communityDocs,
              organizations: orgDocs
            });
          }
        });
      }
    });
  }
};

communityController.admin.activate = {
  post: function (req, res) {
    communityModel.findOne({_id: req.body.id}, function (findErr, doc) {
      if (findErr) {
        logger.error(findErr);
        res.status(httpStatus.BAD_REQUEST).json({message: 'Cannot process your request at this time'});
      }
      else {
        doc.approved = true;
        doc.save(function (saveErr) {
          if (saveErr) {
            logger.error(saveErr);
            res.status(httpStatus.BAD_REQUEST).json({message: 'Cannot process your request at this time'});
          }
          else {
            res.status(httpStatus.ACCEPTED).json({message: 'Successful'});
          }
        });
      }
    });
  }
};

communityController.admin.deactivate = {
  post: function (req, res) {
    communityModel.findOne({_id: req.body.id}, function (findErr, doc) {
      if (findErr) {
        logger.error(findErr);
        res.status(httpStatus.BAD_REQUEST).json({message: 'Cannot process your request at this time'});
      }
      else {
        doc.approved = false;
        doc.save(function (saveErr) {
          if (saveErr) {
            logger.error(saveErr);
            res.status(httpStatus.BAD_REQUEST).json({message: 'Cannot process your request at this time'});
          }
          else {
            res.status(httpStatus.ACCEPTED).json({message: 'Successful'});
          }
        });
      }
    });
  }
};

communityController.admin.delete = {
  post: function (req, res) {
    communityModel.remove({_id: req.body.id}, function (findErr) {
      if (findErr) {
        logger.error(findErr);
        res.status(httpStatus.BAD_REQUEST).json({message: 'Cannot process your request at this time'});
      }
      else {
        res.status(httpStatus.ACCEPTED).json({message: 'Success'});
      }
    });
  }
};

communityController.user.image = {
  get: function (req, res) {
    docHlpr.getDataFromS3(req, res, '/images/community');
  }
};

communityController.user.about = {
  get: function (req, res) {
    var namePattern = {$regex: new RegExp("^" + req.params.urlNameID, "i")};
    communityModel.findOne({$or: [{name: namePattern}, {urlFriendlyID: namePattern}]}, function (findErr, doc) {
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

                          res.render('community/user-about', {
                            community: doc,
                            discoveries: problems,
                            organization: orgDoc,
                            members: oldOrgs,
                            newMembers: newOrgs,
                            memberRoles: Object.keys(orgRoles),
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
  },
  post: function (req, res) {
    var namePattern = {$regex: new RegExp("^" + req.params.urlNameID, "i")};
    communityModel.findOne({$or: [{name: namePattern}, {urlFriendlyID: namePattern}]}, function (findErr, doc) {
      if (findErr) {
        res.send('error', {message: 'Cannot process your request at this time', error: findErr});
      } else if (doc) {
        if (res.locals.isOrgAdmin) {
          var fields = {};
          if (req.body.description) {
            doc.description = req.body.description;
          }
          else if (req.body.customTabContent && req.body.tabTitle) {
            doc.tabContent = req.body.customTabContent;
            doc.tabTitle = req.body.tabTitle;
            if (!req.body.hideTab == true) {
              req.body.hideTab = false
            }
            doc.showTab = req.body.hideTab;
          }
          else if (req.body.customTabContent2 && req.body.tabTitle2) {
            doc.tabContent2 = req.body.customTabContent2;
            doc.tabTitle2 = req.body.tabTitle2;
            if (!req.body.hideTab2 == true) {
              req.body.hideTab2 = false
            }
            doc.showTab2 = req.body.hideTab2;
          }
          else if (req.body.whyJoin) {
            doc.whyJoin = req.body.whyJoin;
          }
          else if (req.body.caption) {
            doc.caption = req.body.caption;
          }
          else if (req.body.jumbotronBase64) {
            _saveDataUrl(cfg.imageUploadDir + '/community_jumbotron_' + stringHelpers.getUrlFriendlyString(doc.name), req.body.jumbotronBase64);
            var extension = req.body.jumbotronBase64.match(/\/(.*)\;/)[1];
            doc.jumbotronUrl = cfg.orgImageURL + '/community_jumbotron_' + stringHelpers.getUrlFriendlyString(doc.name) + '.' + extension;
          }
          else if (req.body.jumbotronUrl) {
            doc.jumbotronUrl = req.body.jumbotronUrl;
          }
          else if (req.body.logo) {
            _saveDataUrl(cfg.imageUploadDir + '/community_logo_' + stringHelpers.getUrlFriendlyString(doc.name), req.body.logo);
            var extension = req.body.logo.match(/\/(.*)\;/)[1];
            doc.logoUrl = cfg.orgImageURL + '/community_logo_' + stringHelpers.getUrlFriendlyString(doc.name) + '.' + extension;
          }
          doc.save();
          res.send({error: false, message: 'Updated Successfully'});
        }
        else {
          res.send({error: true, message: 'Not authorized to make changes'});
        }
      } else {
        res.render({error: true, message: 'Community not found.'});
      }
    });
  }
};

communityController.user.aboutInformation = {
  get: function (req, res) {
    _HelperGetInfo(req, res, 'community/user-about-information');
  },
  post: function (req, res) {
    _HelperPostInfo(req, res);
  }
};

communityController.user.members = {
  get: function (req, res) {
    _HelperGetInfo(req, res, 'community/user-members');
  }/*,
  post: function (req, res) {
    
  }*/
};

communityController.user.capabilities = {
  get: function (req, res) {
    _HelperGetInfo(req, res, 'community/user-capabilities');
  }/*,
   post: function (req, res) {

   }*/
};

communityController.user.problems = {
  get: function (req, res) {
    _HelperGetInfo(req, res, 'community/user-problems');
  }/*,
   post: function (req, res) {

   }*/
};

communityController.user.newspost = {
  get: function (req, res) {
    _HelperGetInfo(req, res, 'community/user-newspost');
  }/*,
   post: function (req, res) {

   }*/
};

communityController.user.dataDepot = {
  get: function (req, res) {
    _HelperGetInfo(req, res, 'community/user-data-depot');
  },
  post: function (req, res) {
    _HelperPostInfo(req, res);
  }
};

communityController.user.ngage = {
  get: function (req, res) {
    _HelperGetInfo(req, res, 'community/user-ngage');
  },
  post: function (req, res) {
    _HelperPostInfo(req, res);
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
                          memberRoles: Object.keys(orgRoles),
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

var _HelperPostInfo = function (req, res) {
  //var namePattern = {$regex: new RegExp("^" + req.params.urlNameID, "i")};
  //communityModel.findOne({$or: [{name: namePattern}, {urlFriendlyID: namePattern}]}, function (findErr, doc) {
  communityModel.findOne({urlFriendlyID: res.locals.geoIntCommunityUrlFriendlyId}, function (findErr, doc) {
    if (findErr) {
      res.send('error', {message: 'Cannot process your request at this time', error: findErr});
    } else if (doc) {
      if (res.locals.isOrgAdmin) {
        var fields = {};
        if (req.body.description) {
          doc.description = req.body.description;
        }
        else if (req.body.customTabContent && req.body.tabTitle) {
          doc.tabContent = req.body.customTabContent;
          doc.tabTitle = req.body.tabTitle;
          if (!req.body.hideTab == true) {
            req.body.hideTab = false
          }
          doc.showTab = req.body.hideTab;
        }
        else if (req.body.customTabContent2 && req.body.tabTitle2) {
          doc.tabContent2 = req.body.customTabContent2;
          doc.tabTitle2 = req.body.tabTitle2;
          if (!req.body.hideTab2 == true) {
            req.body.hideTab2 = false
          }
          doc.showTab2 = req.body.hideTab2;
        }
        else if (req.body.whyJoin) {
          doc.whyJoin = req.body.whyJoin;
        }
        else if (req.body.caption) {
          doc.caption = req.body.caption;
        }
        else if (req.body.jumbotronBase64) {
          _saveDataUrl(cfg.imageUploadDir + '/community_jumbotron_' + stringHelpers.getUrlFriendlyString(doc.name), req.body.jumbotronBase64);
          var extension = req.body.jumbotronBase64.match(/\/(.*)\;/)[1];
          doc.jumbotronUrl = cfg.orgImageURL + '/community_jumbotron_' + stringHelpers.getUrlFriendlyString(doc.name) + '.' + extension;
        }
        else if (req.body.jumbotronUrl) {
          doc.jumbotronUrl = req.body.jumbotronUrl;
        }
        else if (req.body.logo) {
          _saveDataUrl(cfg.imageUploadDir + '/community_logo_' + stringHelpers.getUrlFriendlyString(doc.name), req.body.logo);
          var extension = req.body.logo.match(/\/(.*)\;/)[1];
          doc.logoUrl = cfg.orgImageURL + '/community_logo_' + stringHelpers.getUrlFriendlyString(doc.name) + '.' + extension;
        }
        doc.save();
        res.send({error: false, message: 'Updated Successfully'});
      }
      else {
        res.send({error: true, message: 'Not authorized to make changes'});
      }
    } else {
      res.render({error: true, message: 'Community not found.'});
    }
  });
};

communityController.user.createProblem = {
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
                _saveDataUrl(cfg.imageUploadDir + '/discovery_thumbnail_' + newProblem.name, req.body.thumbnail);
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
    }
  }
};

communityController.user.delete = {
  get: function (req, res) {
  },
  post: function (req, res) {
  }
};

// LH: This is for testing
communityController.user.addIsmOrganizationsToGsm = {
  get: function (req, res) {
    addIsmOrganizationsToGsm();
    res.json({'message':'Adding ISM organizations to GSM...'});
  }
};

var addIsmOrganizationsToGsm = function () {
  // Loop through ISM organizations and add those not already members of GSM
  communityModel.aggregate( 
    [
      {
        $match: {'urlFriendlyID': 'geoint-industry-solutions-marketspace'}
      },
      {
        $unwind: "$members"
      }
    ], 
  function(aggregateErr, communityDocMembers) {
    if (aggregateErr) {
      logger.error(aggregateErr);
    }
    else {
      // See which organizations are not already members of GSM
      communityModel.aggregate(
        [
          {
            $match: {'urlFriendlyID': 'geoint-solutions-marketplace'}
          },
          {
            $unwind: "$members"
          }
        ],
        function (aggregateErr2, communityDocMembers2) {
          // Find all of the organizations in ISM NOT already in GSM
          var isMember = false;
          for (var idxCommunityDocMembers in communityDocMembers) {
            for (var idxCommunityDocMembers2 in communityDocMembers2) {
              if (communityDocMembers[idxCommunityDocMembers].members.toString() == communityDocMembers2[idxCommunityDocMembers2].members.toString()) {
                isMember = true;
                break; 
              }
            }
            if (!isMember) {
              organizationModel.findOne({'_id':communityDocMembers[idxCommunityDocMembers].members}, function(findOneErr, orgDoc) {
                if (findOneErr){
                  logger.error(findOneErr);
                }
                else {
                  if (orgDoc) {
                    insertOrganizationIntoGsm(orgDoc);
                  }
                }
              });
            }
            else {
              isMember = false;
            }
          }
        });
    }
  });
};

var insertOrganizationIntoGsm = function (orgDoc) {
  // Add the organization to the GSM community
  communityModel.findOne({'urlFriendlyID':'geoint-solutions-marketplace'}, function(findErr, communityDoc) {
    if (findErr) {
      logger.error(findErr);
    }
    else {
      communityDoc.members.push(orgDoc._id);
      communityDoc.save(function(saveErr){
        if (saveErr) {
          logger.error(saveErr);
        }
        else {
          // Add the organization's capabilities to the GSM community
          organizationModel.aggregate([
            {
              $match: {'_id': orgDoc._id} 
            },
            {
              $lookup: {
                "from": "products",
                "localField": "_id",
                "foreignField": "orgRef",
                "as": "capability"
              }
            },
            {
              $unwind: "$capability"
            }
          ], function (aggregateCapabilityErr, orgDocs) {
            if (aggregateCapabilityErr) {
              logger.error(aggregateCapabilityErr)
            }
            else {
              for (var idx in orgDocs) {
                communityDoc.solutions.push(orgDocs[idx].capability._id);
                communityDoc.save(function(saveErr){
                  logger.error(saveErr);
                })
              }
            }
          });

          // Add the organization's problems to the GSM community
          organizationModel.aggregate([
            {
              $match: {'_id': orgDoc._id}
            },
            {
              $lookup: {
                "from": "challenges",
                "localField": "_id",
                "foreignField": "orgRef",
                "as": "problem"
              }
            },
            {
              $unwind: "$problem"
            }
          ], function (aggregateProblemErr, orgDocs) {
            if (aggregateProblemErr) {
              logger.error(aggregateProblemErr)
            }
            else {
              for (var idx in orgDocs) {
                communityDoc.discoveries.push(orgDocs[idx].problem._id);
                communityDoc.save(function(saveErr){
                  logger.error(saveErr);
                })
              }
            }
          });

          // Add the organization's news to the GSM community
          communityModel.aggregate([
            {
              // Find communities other than GSM
              $match: {'urlFriendlyID': {$nin: ['geoint-solutions-marketplace']}}
            },
            {
              // Separate the results into individual documents based on the news array
              $unwind: '$news'
            },
            {
              // Get the account whose email is referenced
              $lookup: {
                "from": "accounts",
                "localField": "news.publishedBy",
                "foreignField": "email",
                "as": "account"
              }
            }
          ], function (aggregateComErr, comDocs) {
            if (aggregateComErr) {
              logger.error(aggregateComErr)
            }
            else {
              for (var idxComDocs in comDocs) {
                if (comDocs[idxComDocs].account[0].orgRef == orgDoc._id) {
                  communityDoc.news.push(comDocs[idxComDocs].news);
                  communityDoc.save(function (saveErr) {
                    logger.error(saveErr);
                  })
                }
              }
            }
          });
        }
      });
    }
  });

};

// Admin
//====================================================
communityController.admin.list = {
  get: function (req, res) {
    communityModel.find({}, function (communityErr, communityDocs) {
      if (communityErr) {
        res.render('error', {message: 'Cannot process your request at this time', error: communityErr});
      }
      else {
        organizationModel.find({}, function (orgErr, orgDocs) {
          if (orgErr) {
            res.render('error', {message: 'Cannot process your request at this time', error: orgErr});
          }
          else {
            res.render('community/admin-list', {
              title: 'Communities',
              communities: communityDocs,
              organizations: orgDocs
            });
          }
        });
      }
    });
  }
};

communityController.admin.update = {
  get: function (req, res) {
    if (!req.params.id) {
      res.render('error', {
        title: 'No ID given',
        message: 'Please provide a proper ID for a community'
      });
    }
    else {
      communityModel.findOne({_id: req.params.id}, function (err, communityDoc) {
        if (err) {
          logger.error(error);
          res.render('error', {
            title: 'Sorry for the inconvenience',
            message: 'Sorry for the inconvenience. We are addressing the issue as we speak',
            error: error
          });
        }
        else {
          organizationModel.find({}, function (orgErr, orgDocs) {
            if (orgErr) {
            }
            else {
              res.render('community/admin-update', {
                title: 'Admin Community Edit',
                community: communityDoc,
                communityTypes: community.communityTypes,
                organizations: orgDocs
              });
            }
          });
        }
      });
    }
  },
  post: function (req, res) {
    if (!req.params.id) {
      res.render('error', {
        title: 'No ID given',
        message: 'Please provide a proper ID for a community'
      });
    }
    else {
      var conditions = {_id: req.params.id}
        , update = req.body
        , options = {multi: false};
      if (req.body.logoUrl) {
        _saveDataUrl(cfg.imageUploadDir + '/community_logo_' + stringHelpers.getUrlFriendlyString(update.name), req.body.logoUrl);
        var extension = req.body.logoUrl.match(/\/(.*)\;/)[1];
        update.logoUrl = cfg.orgImageURL + '/community_logo_' + stringHelpers.getUrlFriendlyString(update.name) + '.' + extension;
      }
      if (req.body.jumbotronUrl) {
        _saveDataUrl(cfg.imageUploadDir + '/community_jumbotron_' + stringHelpers.getUrlFriendlyString(update.name), req.body.jumbotronUrl);
        var extension = req.body.jumbotronUrl.match(/\/(.*)\;/)[1];
        update.jumbotronUrl = cfg.orgImageURL + '/community_jumbotron_' + stringHelpers.getUrlFriendlyString(update.name) + '.' + extension;
      }

      communityModel.findOneAndUpdate(conditions, update, options, function (err, communityDoc) {
        if (err) {
          logger.error(error);
          res.render('error', {
            title: 'Sorry for the inconvenience',
            message: 'Sorry for the inconvenience. The issue has been logged and will be addressed',
            error: error
          });
        }
        else {
          organizationModel.find({}, function (orgErr, orgDocs) {
            if (orgErr) {
            }
            else {
              res.render('community/admin-update', {
                title: 'Admin Community Edit',
                community: communityDoc,
                communityTypes: community.communityTypes,
                organizations: orgDocs
              });
            }
          });
        }
      })
    }
  }
};

communityController.user.news = {view: {}, update: {}, delete: {}};
communityController.user.news.view.get = function (req, res) {
  _getNewsViewData(req, res, true, true, function (err, results) {
    results.title = results.newsArticle.headline;
    res.render('news/view', results);
  });
};
communityController.user.news.update = {
  get: function (req, res) {
      _getNewsViewData(req, res, false, false, function (err, results) {
      results.title = results.newsArticle.headline;
      results.community = {}; // LH: This is to fix the 404 when updating news posts
      results.community.urlFriendlyID = res.locals.geoIntCommunityUrlFriendlyId;  
      res.render('news/update', results);
    });
  },
  post: function (req, res) {
    var newPostObj = {
      approved: req.body.approved,
      headline: req.body.headline,
      urlFriendlyID: '',
      releaseDate: req.body.releaseDate,
      categories: req.body.categories ? req.body.categories.split(',') : [],
      content: req.body.content || ''
    };
    newPostObj.urlFriendlyID = encodeURIComponent(newPostObj.headline.replace(/ /g, '-').replace('/', '').toLowerCase());
    helperFunctions.getNewsStory(req.params.newsRouteID, req.params.urlNameID, function (err, results) {
      var orginalDoc = results[0].news;
      helperFunctions.getNewsStory(newPostObj.urlFriendlyID, req.body.urlNameID, function (err, checkForDups) {
          if (checkForDups.length > 1 || (orginalDoc.urlFriendlyID != newPostObj.urlFriendlyID && checkForDups.length != 0)) {
            _getNewsViewData(req, res, false, false, function (err, results) {
              results.title = results.newsArticle.headline;
              results.errorMessage = 'Duplicate Headline';
              res.render('news/update', results);
            });
          }
          else {

            newPostObj.publishedBy = results[0].news.publishedBy;
            if (req.files.image) {
              newPostObj.image = {};
              newPostObj.image.name = req.files.image.originalname;
              newPostObj.image.mimetype = req.files.image.mimetype;
              newPostObj.image.path = cfg.problemDocURL + '/' + req.files.image.name;
            }
            else if (results[0] && results[0].news && results[0].news.image) {
              newPostObj.image = results[0].news.image;
            }
            if (req.files.attachment) {
                newPostObj.attachment = {};
                newPostObj.attachment.name = req.files.attachment.originalname;
                newPostObj.attachment.mimetype = req.files.attachment.mimetype;
                newPostObj.attachment.path = cfg.problemDocURL + '/' + req.files.attachment.name;
            }
            else if (results[0] && results[0].news && results[0].news.attachment) {
                newPostObj.attachment = results[0].news.attachment;
            }

            community.updateNewsPost(req.params.urlNameID, encodeURIComponent(req.params.newsRouteID), newPostObj, function (updateErr, communityDoc) {
              res.redirect('/profile/' + req.user.username + '/manage/' + req.params.urlNameID + '/news/' + newPostObj.urlFriendlyID);
            });

          }
        }
      );
    });
  }
};
communityController.user.news.dashboardUpdate = {
  get: function (req, res) {
    
  },
  put: function (req, res) {
    var newPostObj = {
      approved: req.body.approved,
      headline: req.body.headline,
      urlFriendlyID: '',
      releaseDate: req.body.releaseDate,
      categories: req.body.categories ? req.body.categories.split(',') : [],
      content: req.body.content || ''
    };
    newPostObj.urlFriendlyID = encodeURIComponent(newPostObj.headline.replace(/ /g, '-').replace('/', '').toLowerCase());
    helperFunctions.getNewsStory(req.params.newsUrlFriendlyId, req.params.communityUrlFriendlyId, function (err, results) {
      var originalDoc = results[0].news;
      helperFunctions.getNewsStory(newPostObj.urlFriendlyID, req.params.communityUrlFriendlyId, function (err, checkForDups) {
        if (checkForDups.length > 1 || (originalDoc.urlFriendlyID != newPostObj.urlFriendlyID && checkForDups.length != 0)) {
          results.errorMessage = 'Duplicate news headline. Please try another headline.';
          res.json({error: results.errorMessage});
        }
        else if (!res.locals.userinfo.isOrgAdmin) {
          res.json({error: 'You must be an organization manager in order to update news posts.'});
        }
        else {
          newPostObj.publishedBy = results[0].news.publishedBy;
          if (req.files.image) {
            newPostObj.image = {};
            newPostObj.image.name = req.files.image.originalname;
            newPostObj.image.mimetype = req.files.image.mimetype;
            newPostObj.image.path = cfg.problemDocURL + '/' + req.files.image.name;
          }
          else if (results[0] && results[0].news && results[0].news.image) {
            newPostObj.image = results[0].news.image;
          }
          if (req.files.attachment) {
            newPostObj.attachment = {};
            newPostObj.attachment.name = req.files.attachment.originalname;
            newPostObj.attachment.mimetype = req.files.attachment.mimetype;
            newPostObj.attachment.path = cfg.problemDocURL + '/' + req.files.attachment.name;
          }
          else if (results[0] && results[0].news && results[0].news.attachment) {
            newPostObj.attachment = results[0].news.attachment;
          }

          community.updateNewsPost(req.params.communityUrlFriendlyId, req.params.newsUrlFriendlyId, newPostObj, function (updateErr, communityDoc) {
            if (updateErr) {
              logger.error(updateErr);
              res.status(httpStatus.OK).json({error: 'Newspost could not be updated at this time. Please try again later.'});
            }
            else if (communityDoc) {
              res.status(httpStatus.OK).json({message: 'Newspost updated successfully.'});
            }
          });
        }
      });
    });
  }
};


communityController.admin.news = {list: {}, update: {}, view: {}};

communityController.admin.news.list.get = function (req, res) {
  helperFunctions.getAllNewsArticles(null, function (err, news) {
    organizationModel.find({}, function (err, docs) {
      var results = {};
      if (news) {
        results.title = "News Post";
      }
      results.orgs = docs || [];
      results.news = news;
      res.render('news/admin-list', results);
    });
  });
};
communityController.admin.news.view.get = function (req, res) {
  _getNewsViewData(req, res, true, true, function (err, results) {
    results.title = results.newsArticle.headline;
    res.render('news/view', results);
  });
};
communityController.admin.news.update = {
  get: function (req, res) {
    _getNewsViewData(req, res, false, false, function (err, results) {
      results.title = results.newsArticle.headline;
      results.community = {}; // LH: This is to fix the 404 when updating news posts
      results.community.urlFriendlyID = res.locals.geoIntCommunityUrlFriendlyId;
      res.render('news/admin-update', results);
    });
  },
  post: function (req, res) {
    var newPostObj = {
      approved: req.body.approved,
      headline: req.body.headline,
      urlFriendlyID: '',
      releaseDate: req.body.releaseDate,
      categories: req.body.categories ? req.body.categories.split(',') : [],
      content: req.body.content || ''
    };
    newPostObj.urlFriendlyID = encodeURIComponent(newPostObj.headline.replace(/ /g, '-').replace('/', '').toLowerCase());
    helperFunctions.getNewsStory(req.params.newsRouteID, req.params.urlNameID, function (err, results) {
      var orginalDoc = results[0].news;
      helperFunctions.getNewsStory(newPostObj.urlFriendlyID, req.body.urlNameID, function (err, checkForDups) {
          if (checkForDups.length > 1 || (orginalDoc.urlFriendlyID != newPostObj.urlFriendlyID && checkForDups.length != 0)) {
            _getNewsViewData(req, res, false, false, function (err, results) {
              results.title = results.newsArticle.headline;
              results.errorMessage = 'Duplicate Headline';
              res.render('news/admin-update', results);
            });
          }
          else {
            newPostObj.publishedBy = results[0].news.publishedBy;
            if (req.files.image) {
              newPostObj.image = {};
              newPostObj.image.name = req.files.image.originalname;
              newPostObj.image.mimetype = req.files.image.mimetype;
              newPostObj.image.path = cfg.problemDocURL + '/' + req.files.image.name;
            }
            else if (results[0] && results[0].news && results[0].news.image) {
              newPostObj.image = results[0].news.image;
            }
            if (req.files.attachment) {
                newPostObj.attachment = {};
                newPostObj.attachment.name = req.files.attachment.originalname;
                newPostObj.attachment.mimetype = req.files.attachment.mimetype;
                newPostObj.attachment.path = cfg.problemDocURL + '/' + req.files.attachment.name;
            }
            else if (results[0] && results[0].news && results[0].news.attachment) {
                newPostObj.attachment = results[0].news.attachment;
            }
			
            community.updateNewsPost(req.params.urlNameID, encodeURIComponent(req.params.newsRouteID), newPostObj, function (updateErr, communityDoc) {
              res.redirect('/admin/news/' + req.params.urlNameID + '/' + newPostObj.urlFriendlyID);
            });

          }
        }
      );
    });
  }
};


communityController.api = {
  admin: {
    removeNewsPost: {
      post: function (req, res) {
        community.removeNewsPost(req.body.communityFriendlyURL, req.body.newsFriendlyURL, function (err, results) {
          if (err) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json();
          }
          else {
            res.status(httpStatus.ACCEPTED).json({
              message: "success"
            });
          }
        });
      }
    }
  },
  activate: {
    post: function (req, res) {
      communityModel.findOne({_id: req.body.id}, function (findErr, doc) {
        if (findErr) {
          logger.error(findErr);
          res.status(httpStatus.BAD_REQUEST).json({message: 'Cannot process your request at this time'});
        }
        else {
          doc.approved = true;
          doc.save(function (saveErr) {
            if (saveErr) {
              logger.error(saveErr);
              res.status(httpStatus.BAD_REQUEST).json({message: 'Cannot process your request at this time'});
            }
            else {
              res.status(httpStatus.ACCEPTED).json({message: 'Successful'});
            }
          });
        }
      });
    }
  },
  deactivate: {
    post: function (req, res) {
      communityModel.findOne({_id: req.body.id}, function (findErr, doc) {
        if (findErr) {
          logger.error(findErr);
          res.status(httpStatus.BAD_REQUEST).json({message: 'Cannot process your request at this time'});
        }
        else {
          doc.approved = false;
          doc.save(function (saveErr) {
            if (saveErr) {
              logger.error(saveErr);
              res.status(httpStatus.BAD_REQUEST).json({message: 'Cannot process your request at this time'});
            }
            else {
              res.status(httpStatus.ACCEPTED).json({message: 'Successful'});
            }
          });
        }
      });
    }
  },
  addNewsPost: {
    post: function (req, res) {
      var newPostObj = {
        headline: req.body.headline,
        urlFriendlyID: '',
        publishedBy: req.user.email,
        releaseDate: req.body.releaseDate,
        categories: req.body.categories ? req.body.categories.split(',') : [],
        content: req.body.content || '',
        image: {
          name: "",
          mimetype: "",
          path: ""
        },
        attachment: {
            mimetype: "",
            name: "",
            path: ""
        }
      };

      newPostObj.urlFriendlyID = encodeURIComponent(newPostObj.headline.replace(/ /g, '-').replace('/', '').toLowerCase());

      if (req.files.image) {
        newPostObj.image = {};
        newPostObj.image.name = req.files.image.originalname;
        newPostObj.image.mimetype = req.files.image.mimetype;
        newPostObj.image.path = cfg.problemDocURL + '/' + req.files.image.name;
      }
      if (req.files.attachment) {
          newPostObj.attachment = {};
          newPostObj.attachment.name = req.files.attachment.originalname;
          newPostObj.attachment.mimetype = req.files.attachment.mimetype;
          newPostObj.attachment.path = cfg.problemDocURL + '/' + req.files.attachment.name;
      }
      // Only allow organization managers to post news
      if (res.locals.userinfo.isOrgAdmin) {
        helperFunctions.getNewsStory(newPostObj.urlFriendlyID, req.body.communityurlFriendlyUrl, function (err, dupRecords) {
          if (dupRecords.length === 0) {
            community.addNewsPost(req.body.communityID, newPostObj, function (err) {
              if (err) {
                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                  message: err.message || "Could not process your request at this time"
                });
              }
              else {
                res.status(httpStatus.ACCEPTED).json({message: strings.News.NewsPost});
              }
            });
          }
          else {
            res.status(httpStatus.CONFLICT).json({message: "A news story already exists with that same headline. Please try a different headline."});
          }
        });
      }
      else {
        res.status(httpStatus.FORBIDDEN).json({message: "You must be an organization manager in order to create news posts."});
      }
    }
  },
  removeNewsAttachment: {
      post: function (req, res) {
          
          communityModel.findOne({ _id: req.body.communityID }, function (err, doc) {
              for (var i = 0; i < doc.news.length; i++) {
                  
                  if (doc.news[i].attachment.path == req.body.newsID) {
                      doc.news[i].attachment.path = "";
                      doc.news[i].attachment.mimetype = "";
                      doc.news[i].attachment.name = "";
                  }
                  }
              doc.save(function (saveErr) {
                  if (saveErr) {
                      logger.error(saveErr);
                      res.status(httpStatus.BAD_REQUEST).json({ message: 'Cannot process your request at this time' });
                  }
                  else {
                      docHlpr.removeResourceDocument(cfg.problemDocDir + '/' + path.basename(req.body.newsID), function (removeErr) {
                          if (removeErr) {
                              logger.error(removeErr);

                              callback({
                                  status: httpStatus.INTERNAL_SERVER_ERROR,
                                  results: { message: 'Error Occurred while attempting to remove your document' }
                              });
                          }
                          else {
                              res.status(httpStatus.ACCEPTED).json({
                                  message: "success"
                              });
                          }
                      });
                      
                  }
              });
       
          });
      }
  },
  removeNewsPost: {
    post: function (req, res) {

      if (res.locals.userinfo.isOrgAdmin) {
        community.removeNewsPost(req.body.communityFriendlyURL, req.body.newsFriendlyURL, function (err, results) {
          if (err) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json();
          }
          else {
            res.status(httpStatus.ACCEPTED).json({
              message: "success"
            });
          }
        });
      }
      else {
        res.status(httpStatus.FORBIDDEN).json({message: "You must be an organization manager in order to delete news."});
      }
    }
  }
};

module.exports = {
  communityController: communityController,
  getCommunityMetrics: _gatherMetricCallsOn,
  insertOrganizationIntoGsm: insertOrganizationIntoGsm
};
