var cfg = require('../config'),
  fs = require('fs'),
  logger = require('../utils/logger'),
  organizations = require('../models/organizations').model,
  registrations = require('../models/registrations').Registration,
  products = require('../models/products').model,
  problems = require('../models/challenges').model,
  async = require('async');

var api = {};

api.endpoints = {
  // maybe we should log here how often the api is accessed?
  get: function (req, res) {
    res.json({
      '/all': 'all organizations, capabilities and solution submissions',
      '/all/organizations': 'all organizations',
      '/all/capabilities': 'all capabilities',
      '/all/solution-submissions': 'all solution submissions',
      '/organizations/{urlFriendlyID}': 'organization for the given urlFriendlyID'
    });
  }
};

api.all = {
  // maybe we should log here how often the api is accessed?
  get: function(req, res) {
    async.waterfall([
      function(callback) {
        _getAllOrganizations(function(err, organizations){
          callback(null, {organizations: organizations});
        });
      },
      function(data, callback) {
        _getAllCapabilities(function(err, capabilities){
          data.capabilities = capabilities;
          callback(null, data);
        })
      },
      function(data, callback) {
        _getAllSolutionSubmissions(function(err, solutionSubmissions){
          data.solutionSubmissions = solutionSubmissions;
          callback(null, data);
        });
      }
    ], function(err, data) {
      res.json(data);
    });
  }
};

api.all.organizations = {
  get: function(req, res) {
    _getAllOrganizations(function(err, organizations){
      if (err) {
        res.json({error: err});
      }
      else {
        res.json({organizations: organizations});
      }
    });
  }
};

api.all.capabilities = {
  get: function(req, res) {
    _getAllCapabilities(function(err, capabilities){
      if (err) {
        res.json({error: err});
      }
      else {
        res.json({capabilities: capabilities});
      }
    });
  }
};

api.all.solutionSubmissions = {
  get: function(req, res) {
    _getAllSolutionSubmissions(function(err, solutionSubmissions){
      if (err) {
        res.json({error: err});
      }
      else {
        res.json({solutionSubmissions: solutionSubmissions});
      }
    });
  }
};

api.organization = {
  get: function(req, res) {
    _getOrganization(req.params.urlFriendlyID, function(err, organization){
      if (err) {
        res.json({error: err});
      }
      else {
        res.json({organization: organization});
      }
    });
  }
};

var _getAllOrganizations = function (callback) {
  // Return the following fields
  var query = [
    {
      $project: {
        "technicalPocEmail": 1,
        "technicalPocPhone": 1,
        "technicalPocLastName": 1,
        "technicalPocFirstName": 1,
        "businessPocEmail": 1,
        "businessPocPhone": 1,
        "businessPocLastName": 1,
        "businessPocFirstName": 1,
        "orgType": 1,
        "orgRole": 1,
        "orgWebsite": 1,
        "orgAddress": 1,
        "orgName": 1,
        "urlFriendlyID": 1,
        "weaknesses": 1,
        "strengths": 1,
        "revenue": 1,
        "primaryOffering": 1,
        "currentCustomers": 1,
        "description": 1,
        "size": 1,
        "yearFounded": 1,
        "marketArea": 1,
        "location": 1,
        "tagline": 1,
        "logoUrl": 1,
        "screenShots": 1,
        "dateCreated": 1,
        "dateUpdated": 1,
        "_id": 0
      }
    }
  ];
  // maybe we should log here how often the api is accessed?
  organizations.aggregate(query, function (aggregateErr, organizationDocuments) {
    if (aggregateErr) {
      return callback("Query failed.", null);
    }
    else {
      organizationDocuments.map(function(orgDoc){
        if (orgDoc.logoUrl) {
          var extension = orgDoc.logoUrl.split('.');
          orgDoc.humanReadableLogoFilename = "organization-logo-" + orgDoc.urlFriendlyID + "." + extension[extension.length-1];
        }
        var cnt = 0;
        if (orgDoc.screenShots) {
          orgDoc.screenShots.map(function (screenShot) {
            var screenShotUrl = screenShot;
            var extension = screenShot.split('.');
            extension = extension[extension.length - 1];
            extension = '.' + extension;
            screenShot = {
              screenShotUrl: screenShotUrl,
              humanReadableFilename: 'screen-shot-' + cnt + extension
            };
            orgDoc.screenShots[cnt] = screenShot;
            cnt += 1;
          });
        }
      });
      return callback(null, organizationDocuments);
    }
  });
};

var _getAllCapabilities = function (callback) {
  // maybe we should log here how often the api is accessed?
  var query = [
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
    {
      $project: {
        "_id": 0,
        "description": 1,
        "pocName": 1,
        "name": 1,
        "pocEmail": 1,
        "urlFriendlyID": 1,
        "logoUrl": 1,
        "webLink": 1,
        "category": 1,
        "date_created": 1,
        "date_updated": 1,
        "organization.orgName": 1,
        "organization.urlFriendlyID": 1
      }
    }
  ];
  products.aggregate(query, function(aggregateErr, capabilityDocuments){
    if (aggregateErr) {
      return callback("Query failed.", null);
    }
    else {
      capabilityDocuments.map(function(capDoc){
        if (capDoc.logoUrl) {
          var extension = capDoc.logoUrl.split('.');
          capDoc.humanReadableLogoFilename = "capability-logo-" + capDoc.urlFriendlyID + "." + extension[extension.length-1];
        }
      });
      return callback(null, capabilityDocuments);
    }
  });
};

var _getAllSolutionSubmissions = function (callback) {
  // maybe we should log here how often the api is accessed?

  // First get all of the registration fields
  var problemsQuery = [
    {
      $unwind: "$customRegistrationFields"
    },
    {
      $project: {
        "_id": 1,
        "customRegistrationFields": 1
      }
    }
  ];

  problems.aggregate(problemsQuery, function(problemsAggErr, problemsDocuments){
    if (problemsAggErr) {
      return callback("Query failed.", null);
    }
    else {
      var query = [
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
        {
          $project: {
            "_id": 0,
            "ID": "$_id",
            // "description": 1,
            // "pocName": 1,
            // "pocEmail": 1,
            "whitepaper.path": 1,
            "whitepaper.mimetype": 1,
            "whitepaper.humanReadableFilename": "$whitepaper.name",
            // Rename the challenges and products for consistency
            "problemName": "$challengeName",
            "capabilityName": "$productName",
            "accessInstructions": 1,
            "customFieldResponse.response": 1,
            "customFieldResponse.fieldType": 1,
            "customFieldResponse.fieldId": 1,
            "challengeID": 1,
            "otherDocuments.path": 1,
            "otherDocuments.mimetype": 1,
            "otherDocuments.humanReadableFilename": "$otherDocuments.name",
            "date_created": 1,
            "date_updated": 1,
            // Merged organization fields
            "organization.orgName": 1,
            "organization.urlFriendlyID": 1
          }
        }
      ];
      registrations.aggregate(query, function (aggregateErr, solutionSubmissionsDocuments) {
        if (aggregateErr) {
          return callback("Query failed.", null);
        }
        else {
          // Loop through solution submission attachments and make the human readable filename not an array
          // (It was made an array during the $project renaming above)
          solutionSubmissionsDocuments.map(function (solnDoc) {
            solnDoc.otherDocuments.map(function (attchDoc) {
              if (attchDoc.humanReadableFilename) {
                attchDoc.humanReadableFilename = attchDoc.humanReadableFilename[0];
              }
            });
            // Find and add the custom registration field from the problem
            problemsDocuments.map(function (probDoc) {
              if (probDoc._id.toString() === solnDoc.challengeID) {
                solnDoc.customFieldResponse.map(function (customFieldRespDoc) {
                  if (customFieldRespDoc.fieldId.toString() === probDoc.customRegistrationFields._id.toString()) {
                    customFieldRespDoc.label = probDoc.customRegistrationFields.label;
                  }
                });
              }
            });
          });
          // Cleanup fields that shouldn't be passed back to the user
          solutionSubmissionsDocuments.map(function (solnDoc) {
            delete solnDoc.challengeID;
            var arr = [];
            for (var i = 0; i < solnDoc.customFieldResponse.length; i++){
              var customFieldRespDoc = solnDoc.customFieldResponse[i];
              delete customFieldRespDoc.fieldId;
              if (typeof(customFieldRespDoc.label) === 'undefined') {
                arr.push(i);
              }
            }
            arr.sort(function(a,b){return a-b});
            // If there's no label the field was deleted in the problem form
            for (var i = arr.length-1; i >= 0; i--) {
              solnDoc.customFieldResponse.splice(arr[i],1);
            }
          });
          return callback(null, solutionSubmissionsDocuments);
        }
      });
    }
  });
};

var _getOrganization = function (organizationUrlFriendlyId, callback) {
  // Return the following fields
  var query = [
    {
      $match: {
        "urlFriendlyID": organizationUrlFriendlyId
      }
    },
    {
      $project: {
        "technicalPocEmail": 1,
        "technicalPocPhone": 1,
        "technicalPocLastName": 1,
        "technicalPocFirstName": 1,
        "businessPocEmail": 1,
        "businessPocPhone": 1,
        "businessPocLastName": 1,
        "businessPocFirstName": 1,
        "orgType": 1,
        "orgRole": 1,
        "orgWebsite": 1,
        "orgAddress": 1,
        "orgName": 1,
        "urlFriendlyID": 1,
        "weaknesses": 1,
        "strengths": 1,
        "revenue": 1,
        "primaryOffering": 1,
        "currentCustomers": 1,
        "description": 1,
        "size": 1,
        "yearFounded": 1,
        "marketArea": 1,
        "location": 1,
        "tagline": 1,
        "logoUrl": 1,
        "screenShots": 1,
        "dateCreated": 1,
        "dateUpdated": 1,
        "_id": 0
      }
    }
  ];
  // maybe we should log here how often the api is accessed?
  organizations.aggregate(query, function (aggregateErr, organizationDocument) {
    if (aggregateErr) {
      return callback("Query failed.", null);
    }
    else if (organizationDocument.length < 1) {
      return callback("Organization not found.", null);
    }
    else {
      organizationDocument.map(function(orgDoc){
        if (orgDoc.logoUrl) {
          var extension = orgDoc.logoUrl.split('.');
          orgDoc.humanReadableLogoFilename = "organization-logo-" + orgDoc.urlFriendlyID + "." + extension[extension.length-1];
        }
        var cnt = 0;
        if (orgDoc.screenShots) {
          orgDoc.screenShots.map(function (screenShot) {
            var screenShotUrl = screenShot;
            var extension = screenShot.split('.');
            extension = extension[extension.length - 1];
            extension = '.' + extension;
            screenShot = {
              screenShotUrl: screenShotUrl,
              humanReadableFilename: 'screen-shot-' + cnt + extension
            };
            orgDoc.screenShots[cnt] = screenShot;
            cnt += 1;
          });
        }
      });
      return callback(null, organizationDocument[0]);
    }
  });
};

module.exports = api;

//orgs, capabilities, solution submissions 