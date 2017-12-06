var cfg = require('../config'),
  mongoose = require('mongoose'),
  mongoosastic = require('mongoosastic'),
  path = require('path'),
  docHlpr = require('../utils/documentHelper'),
  objHlpr = require('../utils/objectTools'),
  stringHelpers = require('../utils/stringHelpers'),
  signupFieldValidation = require('../utils/signup-field-validation'),
  httpStatus = require('http-status'),
  objectTools = require('../utils/objectTools'),
  Schema = mongoose.Schema,
  validator = require('../utils/validation'),
  ObjectId = mongoose.Types.ObjectId;
var orgRoles = {both: 'both', client: 'client', provider: 'provider', communityOwner: 'communityowner'};
var orgTypes = {government: 'government', industry: 'industry', academia: 'academia'};

//=============================================================================
//  Schema
//=============================================================================
var organizationSchema = new Schema({
  orgName: {type: String, required: true, trim: true} // Organization Name
  , urlFriendlyID: {type: String, required: true, trim: true} // URL friendly name
  , orgAddress: {type: String, required: true, trim: true} // Organization Address
  , orgWebsite: {type: String, required: true, trim: true} // Organization Website
  , orgRole: {type: String, enum: objHlpr.getValues(orgRoles), required: true, trim: true} // Organization Role
  , orgType: {type: String, enum: objHlpr.getValues(orgTypes), required: true, trim: true}
  , orgId: {
    name: {type: String, required: false, trim: true},
    value: {type: String, required: false, trim: true}
  }
  , orgNaics: {type: String, required: false, default: "", trim: true} // NAICS Code

  , businessPocFirstName: {type: String, required: true, trim: true} // Business Point of Contact First Name
  , businessPocLastName: {type: String, required: true, trim: true} // Business Point of Contact Last Name
  , businessPocPhone: {type: String, required: true, trim: true} // Business Point of Contact Phone
  , businessPocEmail: {type: String, required: true, trim: true} // Business Point of Contact Email

  , technicalPocFirstName: {type: String, required: true, trim: true} // Technical Point of Contact First Name
  , technicalPocLastName: {type: String, required: true, trim: true} // Technical Point of Contact Last Name
  , technicalPocPhone: {type: String, required: true, trim: true} // Technical Point of Contact Phone
  , technicalPocEmail: {type: String, required: true, trim: true} // Technical Point of Contact Email

  , primaryPoc: {type: String, required: true, default: "Business", trim: true}

  , dateCreated: {type: Date, required: false, default: Date.now} // Date
  , dateUpdated: {type: Date, required: false, default: Date.now} // Date
  , approved: {type: Boolean, required: true, default: true} // Approval Flag

  , screenShots: [{type: String, trim: true}]
  , logoUrl: {type: String, required: false, default: "", trim: true}
  , tagline: {type: String, required: false, default: "", trim: true}
  , location: {type: String, required: false, default: "", trim: true}
  , marketArea: {type: String, required: false, default: "", trim: true}
  , yearFounded: {type: String, required: false, default: ""}
  , size: {type: String, required: false, default: "", trim: true}
  , description: {type: String, required: false, default: "", trim: true}
  , currentCustomers: {type: String, required: false, default: "", trim: true}
  , primaryOffering: {type: String, required: false, default: "", trim: true}
  , revenue: {type: String, required: false, default: "", trim: true}
  , strengths: {type: String, required: false, default: "", trim: true}
  , weaknesses: {type: String, required: false, default: "", trim: true}
  , newMemberJoinCommunityLastReminderDay: {type: Date, required: false}
  , newOrganizationLastNotificationDay: {type: Date, required: false}
});

organizationSchema.set('toObject', {getters: true, virtuals: true});

organizationSchema.set('toJSON', {getters: true, virtuals: true});

organizationSchema.plugin(mongoosastic, {host: String(cfg.es.uri)});

var organizations = mongoose.model('organizations', organizationSchema);

// Updated the timestamp whenever an update is called
organizationSchema.pre('save', function(done) {
  this.dateUpdated = new Date();
  done();
});

var _saveOrganizationToDatabase = function (organization, callback) {
  if (typeof(callback) !== 'function') {
    callback({message: 'The callback provided is not a function.'}, null);
  }

  organizations.findOne({'orgId.value': organization.orgId.value}, function (err, orgDoc) {
    if (err || orgDoc) {
      if (organization.orgId.name === 'orgDuns') {
        callback({message: 'The DUNS number provided is already in use.'}, null);
      } else if (organization.orgId.name === 'orgInternalId') {
        callback({message: 'The organization could not be created in the database.'}, null);
      }
    } else {
      organization.save(function (err) {
        if (err) {
          callback({message: 'Error: ' + err}, null);
        } else {
          callback(null, organization);
        }
      });
    }
  });
};

var creator = function (name, address, website, role, type, id, naics, businessPocFirstName, businessPocLastName,
                        businessPocPhone, businessPocEmail, technicalPocFirstName, technicalPocLastName, technicalPocPhone,
                        technicalPocEmail, primaryPoc, approved, screenShots, logoUrl, tagline, location,
                        marketArea, yearFounded, size, description, currentCustomers, primaryOffering, revenue, strengths,
                        weaknesses, callback) {

  if (typeof(callback) !== 'function') {
    callback({message: "The callback provided is not a function."}, null);
  }

  var newOrganization = new organizations();
  newOrganization.orgName = name;
  newOrganization.urlFriendlyID = stringHelpers.getUrlFriendlyString(name);
  newOrganization.orgAddress = address;
  newOrganization.orgWebsite = website;
  newOrganization.orgRole = role.toLowerCase();
  newOrganization.orgType = type.toLowerCase();
  if (id && (newOrganization.orgType === orgTypes.industry || newOrganization.orgType === orgTypes.academia)) {
    newOrganization.orgId.name = 'orgDuns';
    newOrganization.orgId.value = id;
  } else {
    newOrganization.orgId.name = 'orgInternalId';
    newOrganization.orgId.value = newOrganization._id;
  }
  newOrganization.orgNaics = naics;
  newOrganization.businessPocFirstName = businessPocFirstName;
  newOrganization.businessPocLastName = businessPocLastName;
  newOrganization.businessPocPhone = businessPocPhone;
  newOrganization.businessPocEmail = businessPocEmail;
  newOrganization.technicalPocFirstName = technicalPocFirstName;
  newOrganization.technicalPocLastName = technicalPocLastName;
  newOrganization.technicalPocPhone = technicalPocPhone;
  newOrganization.technicalPocEmail = technicalPocEmail;
  newOrganization.primaryPoc = primaryPoc || 'Business';
  newOrganization.screenShots = screenShots;
  newOrganization.logoUrl = logoUrl;
  newOrganization.tagline = tagline;
  newOrganization.location = location;
  newOrganization.marketArea = marketArea;
  newOrganization.yearFounded = yearFounded;
  newOrganization.size = size;
  newOrganization.description = description;
  newOrganization.currentCustomers = currentCustomers;
  newOrganization.primaryOffering = primaryOffering;
  newOrganization.revenue = revenue;
  newOrganization.strengths = strengths;
  newOrganization.weaknesses = weaknesses;
  newOrganization.approved = true;

  // Perform validation
  var status_message = signupFieldValidation.validateOrganizationDataFields(newOrganization);
  if (status_message != true) {
    callback({message: status_message}, null);
  }
  else {
    _saveOrganizationToDatabase(newOrganization, callback);
  }
};

var read = function (databaseId, callback) {
  if (typeof(callback) !== 'function') {
    callback({status: httpStatus.INTERNAL_SERVER_ERROR},
      {message: "The callback provided is not a function."}, null);
  }

  organizations.findOne({_id: databaseId}, {'__v': 0}, function (err, orgDoc) {
    if (err) {
      callback({status: httpStatus.INTERNAL_SERVER_ERROR},
        {message: "Database error: " + err}, null);
    } else if (!orgDoc) {
      callback({status: httpStatus.OK},
        {message: "There is no organization with id " + databaseId + " in the database."}, null);
    } else {
      callback({status: httpStatus.OK},
        {message: "Organization returned successfully."}, orgDoc);
    }
  });

};

// The update uses the monogodb _id as the organization reference
// If a field parameter is defined, then it will be updated; otherwise the current value for the organization field
// will remain as it is
var update = function (databaseId, name, address, website, role, type, routeId, naics, businessPocFirstName, businessPocLastName,
                       businessPocPhone, businessPocEmail, technicalPocFirstName, technicalPocLastName, technicalPocPhone,
                       technicalPocEmail, primaryPoc, approved, screenShots, logoUrl, tagline, location, marketArea,
                       yearFounded, size, description, currentCustomers, primaryOffering, revenue, strengths,
                       weaknesses, callback) {

  if (typeof(callback) !== 'function') {
    callback({status: httpStatus.INTERNAL_SERVER_ERROR},
      {message: "The callback provided is not a function."}, null);
  }

  organizations.findOne({_id: databaseId}, function (err, orgDoc) {
    if (err) {
      callback({status: httpStatus.INTERNAL_SERVER_ERROR},
        {message: "Database error: " + err}, null);
    } else if (!orgDoc) {
      callback({status: httpStatus.OK},
        {message: "There is no organization with id " + databaseId + " in the database."}, null);
    } else {
      orgDoc.orgName = typeof(name) === 'undefined' ? orgDoc.orgName : name;
      orgDoc.orgAddress = typeof(address) === 'undefined' ? orgDoc.orgAddress : address;
      orgDoc.orgWebsite = typeof(website) === 'undefined' ? orgDoc.orgWebsite : website;
      orgDoc.orgRole = typeof(role) === 'undefined' ? orgDoc.orgRole : role.toLowerCase();
      if (typeof(type) !== 'undefined') {
        orgDoc.orgType = type.toLowerCase();
        if (orgDoc.orgType === orgTypes.industry || orgDoc.orgType === orgTypes.academia) {
          orgDoc.orgId.name = 'orgDuns';
          orgDoc.orgId.value = routeId;
        } else {
          orgDoc.orgId.name = 'orgInternalId';
          orgDoc.orgId.value = orgDoc._id;
        }
      }
      orgDoc.orgNaics = typeof(naics) === 'undefined' ? orgDoc.orgNaics : naics;
      orgDoc.businessPocFirstName = typeof(businessPocFirstName) === 'undefined' ? orgDoc.businessPocFirstName : businessPocFirstName;
      orgDoc.businessPocLastName = typeof(businessPocLastName) === 'undefined' ? orgDoc.businessPocLastName : businessPocLastName;
      orgDoc.businessPocPhone = typeof(businessPocPhone) === 'undefined' ? orgDoc.businessPocPhone : businessPocPhone;
      orgDoc.businessPocEmail = typeof(businessPocEmail) === 'undefined' ? orgDoc.businessPocEmail : businessPocEmail;
      orgDoc.technicalPocFirstName = typeof(technicalPocFirstName) === 'undefined' ? orgDoc.technicalPocFirstName : technicalPocFirstName;
      orgDoc.technicalPocLastName = typeof(technicalPocLastName) === 'undefined' ? orgDoc.technicalPocLastName : technicalPocLastName;
      orgDoc.technicalPocPhone = typeof(technicalPocPhone) === 'undefined' ? orgDoc.technicalPocPhone : technicalPocPhone;
      orgDoc.technicalPocEmail = typeof(technicalPocEmail) === 'undefined' ? orgDoc.technicalPocEmail : technicalPocEmail;
      orgDoc.primaryPoc = typeof(primaryPoc) === 'undefined' ? orgDoc.primaryPoc : primaryPoc;
      orgDoc.approved = typeof(approved) === 'undefined' ? orgDoc.approved : approved;
      orgDoc.screenShots = typeof(screenShots) === 'undefinded' ? orgDoc.screenShots : screenShots;
      orgDoc.logoUrl = typeof(logoUrl) === 'undefined' ? orgDoc.logoUrl : logoUrl;
      orgDoc.tagline = typeof(tagline) === 'undefined' ? orgDoc.tagline : tagline;
      orgDoc.location = typeof(location) === 'undefined' ? orgDoc.location : location;
      orgDoc.marketArea = typeof(marketArea) === 'undefined' ? orgDoc.marketArea : marketArea;
      orgDoc.yearFounded = typeof(yearFounded) === 'undefined' ? orgDoc.yearFounded : yearFounded;
      orgDoc.size = typeof(size) === 'undefined' ? orgDoc.size : size;
      orgDoc.description = typeof(description) === 'undefined' ? orgDoc.description : description;
      orgDoc.currentCustomers = typeof(currentCustomers) === 'undefined' ? orgDoc.currentCustomers : currentCustomers;
      orgDoc.primaryOffering = typeof(primaryOffering) === 'undefined' ? orgDoc.primaryOffering : primaryOffering;
      orgDoc.revenue = typeof(revenue) === 'undefined' ? orgDoc.revenue : revenue;
      orgDoc.strengths = typeof(strengths) === 'undefined' ? orgDoc.strengths : strengths;
      orgDoc.weaknesses = typeof(weaknesses) === 'undefined' ? orgDoc.weaknesses : weaknesses;

      // Perform validation
      var status_message = signupFieldValidation.validateOrganizationDataFields(orgDoc);
      if (status_message != true) {
        callback({status: httpStatus.BAD_REQUEST}, {message: status_message}, null);
      }

      orgDoc.save(function (err) {
        if (err) {
          callback({status: httpStatus.INTERNAL_SERVER_ERROR},
            {message: "Error updating organization: " + err}, null);
        } else {
          callback({status: httpStatus.OK},
            {message: "Organization updated successfully."}, orgDoc);
        }
      });
    }
  });
};

var remove = function (databaseId, callback) {
  if (typeof(callback) !== 'function') {
    callback({status: httpStatus.INTERNAL_SERVER_ERROR},
      {message: "The callback provided is not a function."}, null);
  }

  organizations.findOneAndRemove({_id: databaseId}, function (err, orgDoc) {
    if (err) {
      callback({status: httpStatus.INTERNAL_SERVER_ERROR},
        {message: "Database error: " + err}, null);
    } else if (!orgDoc) {
      callback({status: httpStatus.OK},
        {message: "There is no organization with id " + databaseId + " in the database."}, null);
    } else {
      callback({status: httpStatus.OK},
        {message: "Organization deleted successfully."}, null);
    }
  });
};


var addImage = function (orgRef, files, callback) {

  organizations.findOne({'_id': orgRef}, function (findErr, orgDoc) {
    if (findErr) {
      logger.error(findErr);
      callback({
        status: httpStatus.INTERNAL_SERVER_ERROR,
        results: {message: 'Could not process your request at this time'}
      });
    }
    else if (!orgDoc) {
      callback({
        status: httpStatus.NOT_FOUND,
        results: {message: 'No Organization could be found matching'}
      });
    }
    else if (files && files.screenShots && orgDoc.screenShots.length < 5) {
      if ((files.screenShots.length + orgDoc.screenShots.length) >= 6) {

        res.status(httpStatus.INTERNAL_SERVER_ERROR)
          .json({message: ' 5 images allowed for organization screenshots'})
          .end();
        return;
      }
		var invalidFileError;
		for (var screenShots in files) {
    if (!validator.isValidUploadFileType(files[screenShots].mimetype)) {
		invalidFileError = "Invalid File Type";
      
		
          fs.unlink(files[screenShots].path, function (delErr) {
            if (delErr) {
              logger.error(delErr);
            }
          });
       
      }
  }
  if (invalidFileError == "Invalid File Type") {
		  callback({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            results: {message: 'Invalid File Type'}
          });
	  }else{
      var newImages = [];
      if (files.screenShots.constructor === Array) {
        for (var i = 0; i < files.screenShots.length; i++) {
          var newScreenShotImage = cfg.orgImageURL + '/' + files.screenShots[i].name;
          orgDoc.screenShots.push(newScreenShotImage);
          newImages.push(newScreenShotImage);
        }
      }
      else if (typeof files.screenShots === 'object') {
        var newScreenShotImage = cfg.orgImageURL + '/' + files.screenShots.name;
        orgDoc.screenShots.push(newScreenShotImage);
        newImages.push(newScreenShotImage);
      }
      orgDoc.save(function (saveErr) {
        if (saveErr) {
          logger.error(saveErr);
          callback({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            results: {message: 'Could not process your request at this time'}
          });
        }
        else {
			
          callback({
            status: httpStatus.ACCEPTED,
            results: {message: 'Image(s) have been added', imagesUrl: newImages}
          });
        }
      });
	}
    }
  });
};
var removeImage = function (imageName, orgRef, callback) {
  //TODO : This should be moved to an API call
  if (imageName && orgRef) {
    organizations.findOne({'_id': orgRef}, function (err, orgDoc) {
      if (err || !orgDoc) {
        callback({
          status: !orgDoc ? httpStatus.NOT_FOUND : httpStatus.INTERNAL_SERVER_ERROR,
          results: {
            message: (!orgDoc ? 'No Organization could be found' : 'Could not process your request at this time')
          }
        });
      }
      else {
        var imgIdx = orgDoc.screenShots.indexOf(imageName);
        if (imgIdx > -1) {
          orgDoc.screenShots.splice(imgIdx, 1);
          orgDoc.save(function (saveErr) {
            if (saveErr) {
              logger.error(saveErr);
              callback({
                status: httpStatus.INTERNAL_SERVER_ERROR,
                results: {
                  message: 'Could not process your request at this time'
                }
              });
            }
            else {
              docHlpr.removeResourceDocument(cfg.orgImageDir + '/' + path.basename(imageName), function (removeErr) {
                if (removeErr) {
                  callback({
                    status: httpStatus.INTERNAL_SERVER_ERROR,
                    results: {
                      message: 'Image cannot be removed'
                    }
                  });
                }
                else {
                  callback({
                    status: httpStatus.ACCEPTED,
                    results: {
                      message: 'Image Removed'
                    }
                  });
                }
              });
            }
          });
        }
        else {
          callback({
            status: httpStatus.NOT_FOUND,
            results: {
              message: 'No image matches that name'
            }
          });
        }
      }
    });
  }
  else {
    callback({
      status: httpStatus.NOT_FOUND,
      results: {
        message: 'Not Enough Information to find item.'
      }
    });
  }
};

var findDisplayable = function (orgRole, callback) {

  var query = {
    approved: true
  };
  orgRole = orgRole.trim();
  if (orgRole && orgRole != '' && orgRole != 'all') {
    if (orgRole === orgRoles.client) {
      query.orgRole = /client|both/i;
    }
    else if (orgRole === orgRoles.provider) {
      query.orgRole = /Provider|Both/i;
    }
    else if (orgRole === orgRoles.communityOwner) {
      query.orgRole = /communityOwner/i;
    }
    else if (orgRole === orgRoles.both) {
      query.orgRole = /Both/i;
    }
  }
  organizations.find(query).sort({orgName: 1})
    .exec(function (err, orgDocs) {
      callback(err, orgDocs);
    });
};
var findDisplayableSorted = function (orgRole, callback) {

  var query = {
    approved: true
  };
  orgRole = orgRole.trim();
  if (orgRole && orgRole != '' && orgRole != 'all') {
    if (orgRole === orgRoles.client) {
      query.orgRole = /client|both/i;
    }
    else if (orgRole === orgRoles.provider) {
      query.orgRole = /Provider|Both/i;
    }
    else if (orgRole === orgRoles.communityOwner) {
      query.orgRole = /communityOwner/i;
    }
    else if (orgRole === orgRoles.both) {
      query.orgRole = /Both/i;
    }
  }
  
  var currentDate = new Date();
  currentDate.setDate(currentDate.getDate());
  var end = currentDate.toISOString();
  var currentStart = new Date();
  currentStart.setDate(currentStart.getDate() - 21);
  var start = currentStart.toISOString();
    organizations.find({
    approved: true,
    dateCreated: {$lt: start}
  }).sort("orgName").exec(function (e, oldOrgs) {
    organizations.find({
      approved: true,
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

var isDisplayable = function (orgDoc, callback) {
  if (orgDoc.constructor && orgDoc.constructor.modelName == "organizations") {
    //NOTE: If you '&&' undefined to several values it will return undefined not false.
    callback((orgDoc.approved && orgDoc.description && orgDoc.orgAddress  && orgDoc.tagline
    && orgDoc.location  && orgDoc.marketArea && orgDoc.yearFounded && orgDoc.size && orgDoc.logoUrl) || false);
  }
  else if (typeof orgDoc == 'string' || ObjectId.isValid(orgDoc)) {
    var query = {
      _id: orgDoc,
      approved: true,
      description: {$nin: [null, '', ""]},
      orgAddress: {$nin: [null, '', ""]},
      logoUrl: {$nin: [null, '', ""]},
      tagline: {$nin: [null, '', ""]},
      location: {$nin: [null, '', ""]},
      marketArea: {$nin: [null, '', ""]},
      yearFounded: {$nin: [null, '', ""]},
      size: {$nin: [null, '', ""]},
      orgWebsite: {$nin: [null, '', ""]},
      businessPocFirstName: {$nin: [null, '', ""]},
      businessPocLastName: {$nin: [null, '', ""]},
      businessPocPhone: {$nin: [null, '', ""]},
      businessPocEmail: {$nin: [null, '', ""]},
      technicalPocFirstName: {$nin: [null, '', ""]},
      technicalPocLastName: {$nin: [null, '', ""]},
      technicalPocPhone: {$nin: [null, '', ""]},
      technicalPocEmail: {$nin: [null, '', ""]}
    };

    organizations.findOne(query, function (err, orgDocs) {
      if (err || !orgDocs) {
        logger.error(err);
        callback(false);
      } else {
        callback(true);
      }
    });
  }
  else {
    callback(false);
  }
};

module.exports = {
  model: organizations,
  schema: organizationSchema,
  removeImage: removeImage,
  addImage: addImage,
  creator: creator,
  read: read,
  update: update,
  remove: remove,
  types: orgTypes,
  roles: orgRoles,
  findDisplayable: findDisplayable,
  findDisplayableSorted: findDisplayableSorted,
  isDisplayable: isDisplayable
};


