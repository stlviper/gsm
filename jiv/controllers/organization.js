var organizations = require('../models/organizations').model,
  findDisplayable = require('../models/organizations').findDisplayable,
  findDisplayableSorted = require('../models/organizations').findDisplayableSorted,
  isDisplayable = require('../models/organizations').isDisplayable,
  orgRoles = require('../models/organizations').roles,
  orgType = require('../models/organizations').types,
  validate = require('../utils/signup-field-validation'),
  auth = require('../auth'),
  accounts = require('../models/accounts').model,
  httpStatus = require('http-status'),
  cfg = require('../config'),
  logger = require('../utils/logger'),
  path = require('path'),
  stringHelpers = require('../utils/stringHelpers'),
  docHlpr = require('../utils/documentHelper'),
  community = require('../models/communities'),
  communityModel = community.model,
  Capabilities = require('../models/products').model,
  fs = require('fs'),
  moment = require('moment');

var saveDataUrl = docHlpr.saveDataUrl;

var _moveUploadImage = function (uploadPath, newPath) {
  if (uploadPath === newPath) {
    return;
  }
  fs.exists(newPath, function (exists) {
    if (!exists) {
      fs.rename(uploadPath, newPath, function (err) {
        if (err) logger.error(err);
      });
    }
  });
};

var orgController = {};
/**
 * Validates if an organization exists in the mongo database.
 * @param org Format: {nameOfKeyToSearchOn: valueToMatch}
 */
orgController.doesOrganizationExist = function (org) {
  return organizations.findOne({'org.key': org.value}, function (err, organization) {
    if (organization) {
      return true;
    }
    return false;
  });
};

orgController.validateOrganizationDataFields = function (req, res, callback) {
  if (typeof(callback) !== 'function') {
    return;
  }

  var status_message = validate.validateOrganizationDataFields(req);
  if (status_message !== true) {
    return callback({error: status_message});
  }
  return callback({});
};

orgController.createOrganization = function (req, res, callback) {
  if (typeof(callback) !== 'function') {
    return;
  }
  // check if website had http(s):// prepended, if not, prepend
  if (req.body.orgWebsite.match(/^https?:\/\//) === null) {
    req.body.orgWebsite = 'http://' + req.body.orgWebsite;
  }
  // Create the organization object and save it to the database
  var newOrganization = new organizations;
  newOrganization.orgName = req.body.orgName;
  newOrganization.urlFriendlyID = stringHelpers.getUrlFriendlyString(req.body.orgName);
  newOrganization.orgAddress = req.body.orgAddress;
  newOrganization.orgWebsite = req.body.orgWebsite;
  newOrganization.orgRole = req.body.orgRole.toLowerCase();
  newOrganization.orgType = req.body.orgType.toLowerCase();
  newOrganization.orgNaics = req.body.orgNaics;
  newOrganization.primaryPoc = 'business';
  if (req.body.orgType === orgType.government) {
    newOrganization.orgId.name = 'orgInternalId';
    newOrganization.orgId.value = newOrganization._id;
  } else if (req.body.orgType === orgType.industry) {
    newOrganization.orgId.name = 'orgDuns';
    newOrganization.orgId.value = req.body.orgRouteId;
  } else if (req.body.orgType === orgType.academia) {
    newOrganization.orgId.name = 'orgDuns';
    newOrganization.orgId.value = req.body.orgRouteId;
  }

  // This will be passed to the account being created
  req.body.orgId = newOrganization.orgId;

  newOrganization.businessPocFirstName = req.body.businessPocFirstName;
  newOrganization.businessPocLastName = req.body.businessPocLastName;
  newOrganization.businessPocPhone = req.body.businessPocPhone;
  newOrganization.businessPocEmail = req.body.businessPocEmail;
  newOrganization.technicalPocFirstName = req.body.technicalPocFirstName;
  newOrganization.technicalPocLastName = req.body.technicalPocLastName;
  newOrganization.technicalPocPhone = req.body.technicalPocPhone;
  newOrganization.technicalPocEmail = req.body.technicalPocEmail;
  newOrganization.approved = false;

  organizations.find({'orgId.value': newOrganization.orgId.value}, function (err, organization) {
    if (err || organization.length > 0) {
      if (newOrganization.orgId.name === 'orgDuns') {
        return callback({error: 'The DUNS number provided is already in use.'}, newOrganization);
      }
      else if (newOrganization.orgId.name === 'orgInternalId') {
        return callback({error: 'The organization could not be created in the database.'}, newOrganization);
      }
    } else {
      newOrganization.save(function (err) {
        if (err) {
          return callback({error: 'Cannot create organization.'}, null);
        }
        else {
          return callback(null, newOrganization);
        }
      });
    }
  });
};

orgController.getOrganization = function (req, res, callback) {
  if (typeof(callback) !== 'function') {
    return;
  } else if (!req.params.orgRouteId) {
    return callback({error: "An ID must be provided to search for an organization in the database."});
  }

  organizations.findOne({'orgId.value': req.params.orgRouteId}, function (err, organization) {
    if (err) {
      return callback({error: "Error: " + err});
    } else if (organization) {
      return callback(organization);
    } else if (!organization) {
      return callback({error: "There is no organization with ID " + req.params.orgRouteId + " in the database."});
    }
  });
};

orgController.getOrganizationById = function (id, callback) {
  if (typeof(callback) !== 'function') {
    return;
  } else if (!id) {
    return callback(null, {message: "An ID must be provided to search for an organization in the database."});
  }

  organizations.findOne({_id: id}, function (err, organization) {
    if (err) {
      return callback(null, {error: "Error: " + err});
    } else if (organization) {
      return callback(organization, null);
    } else if (!organization) {
      return callback(null, {message: "There is no organization with ID " + id + " in the database."});
    }
  });
}

orgController.getOrganizationByName = function (req, res, callback) {
  if (typeof(callback) !== 'function') {
    return;
  } else if (!req.body.orgName) {
    return callback(null, {message: "A name must be provided to search for an organization in the database."});
  }

  organizations.findOne({'orgName': req.body.orgName}, function (err, organization) {
    if (err) {
      return callback(null, {error: "Error: " + err});
    } else if (organization) {
      return callback(organization, {});
    } else if (!organization) {
      return callback(null, {message: "There is no organization with name " + req.body.orgName + " in the database."});
    }
  });
};

orgController.getOrganizationByUrlFriendlyName = function (req, res, callback) {
  var orgRouteId = req.params.orgRouteId || req.body.orgRouteId;
  if (typeof(callback) !== 'function') {
    return;
  } else if (!orgRouteId) {
    return callback(null, {message: "A name must be provided to search for an organization in the database."});
  }

  organizations.findOne({'urlFriendlyID': orgRouteId}, function (err, organization) {
    if (err) {
      return callback(null, {error: "Error: " + err});
    } else if (organization) {
      return callback(organization, null);
    } else if (!organization) {
      return callback(null, {message: "There is no organization with name " + orgRouteId + " in the database."});
    }
  });
};

orgController.getOrganizationByDuns = function (req, res, callback) {
  if (typeof(callback) !== 'function') {
    return;
  } else if (!req.body.orgDuns) {
    return callback(null, {message: "A DUNS number must be provided to search for an organization in the database."});
  }

  organizations.findOne({'orgId.value': req.body.orgDuns}, function (err, organization) {
    if (err) {
      return callback(null, {error: "Error: " + err});
    } else if (organization) {
      return callback(organization, {});
    } else if (!organization) {
      return callback(null, {message: "There is no organization with DUNS number " + req.body.orgDuns + " in the database."});
    }
  });
};

orgController.deleteOrganization = function (req, res, callback) {
  var orgRouteId = req.params.orgRouteId || req.body.orgRouteId;
  if (typeof(callback) !== 'function') {
    return;
  } else if (!orgRouteId) {
    return callback({error: "An ID must be provided to delete an organization from the database."});
  }

  organizations.findOne({'urlFriendlyID': orgRouteId}, function (err, organization) {
    if (err) {
      callback({error: "Error: " + err});
    } else if (organization) {
      organization.remove();
      return callback({});
    } else if (!organization) {
      return callback({error: "There is no organization with ID " + orgRouteId + " in the database."});
    }
  });
};

orgController.updateOrganization = function (req, res, isAdmin, callback) {
  var orgRouteId = req.params.orgRouteId || req.body.orgRouteId;
  if (typeof(callback) !== 'function') {
    return;
  }

  var query = {};
  if (isAdmin) {
    query = {'urlFriendlyID': orgRouteId};
  } else {
    query = {'_id': req.user.orgRef};
  }

  // As shown in the mongoose docs, use findOne to get the document to update, update the desired fields, and then save it
  organizations.findOne(query, function (err, organization) {
    if (err) {
      return callback({error: "Error: " + err});
    } else if (organization) {

      // check if website had http(s):// prepended, if not, prepend
      if (req.body.orgWebsite.match(/^https?:\/\//) === null) {
        req.body.orgWebsite = 'http://' + req.body.orgWebsite;
      }

      organization.orgName = req.body.orgName;
      organization.orgAddress = req.body.orgAddress;
      organization.orgWebsite = req.body.orgWebsite;
      organization.orgRole = req.body.orgRole.toLowerCase();
      organization.orgType = req.body.orgType.toLowerCase();
      organization.orgNaics = req.body.orgNaics;
      if (organization.orgType === orgType.government) {
        organization.orgId.name = 'orgInternalId';
        organization.orgId.value = organization._id;
        organization.orgNaics = '';
      }
      else if (organization.orgType === orgType.industry) {
        organization.orgId.name = 'orgDuns';
        organization.orgId.value = req.body.orgRouteId || "";
      }
      else if (organization.orgType === orgType.academia) {
        organization.orgId.name = 'orgDuns';
        organization.orgId.value = req.body.orgRouteId || "";
      }

      organization.tagline = req.body.tagline;
      organization.location = req.body.location;
      organization.marketArea = req.body.marketArea;
      organization.yearFounded = req.body.yearFounded;
      organization.size = req.body.size;
      organization.description = req.body.description;

      organization.businessPocFirstName = req.body.businessPocFirstName;
      organization.businessPocLastName = req.body.businessPocLastName;
      organization.businessPocPhone = req.body.businessPocPhone;
      organization.businessPocEmail = req.body.businessPocEmail;

      organization.technicalPocFirstName = req.body.technicalPocFirstName;
      organization.technicalPocLastName = req.body.technicalPocLastName;
      organization.technicalPocPhone = req.body.technicalPocPhone;
      organization.technicalPocEmail = req.body.technicalPocEmail;

      // Validate all data fields
      var status_message = validate.validateOrganizationDataFields(organization);
      if (status_message !== true) {
        return callback({message: status_message});
      }

      /*if (req.files && req.files.uploadLogo) {
       organization.logoUrl = cfg.orgImageURL + '/' + req.files.uploadLogo.name;
       //_moveUploadImage(req.files.uploadLogo.path, cfg.orgImageDir + '/' + req.files.uploadLogo.name);
       }*/
      if (req.body.uploadLogoURI) {
        saveDataUrl(cfg.imageUploadDir + '/logo_' + organization.orgName, req.body.uploadLogoURI);
        var extension = req.body.uploadLogoURI.match(/\/(.*)\;/)[1];
        organization.logoUrl = cfg.orgImageURL + '/logo_' + organization.orgName + '.' + extension;
      }
      if (organization.screenShots.length === 0) {
        organization.screenShots = [];
      }

      if (req.files && req.files.screenShots && organization.screenShots.length < 5) {
        if ((req.files.screenShots.length + organization.screenShots.length) >= 6) {
          return callback({message: 'Only 5 images are allowed for organization screenshots.'});
        }
        for (var i = 0; i < req.files.screenShots.length; i++) {
          var newScreenShotImage = cfg.orgImageURL + '/' + req.files.screenShots[i].name;
          organization.screenShots.push(newScreenShotImage);
        }
      }

      if (isDisplayable(organization, function (isDisplayableBoolean) {

          organization.displayable = isDisplayableBoolean || false;

          organization.save(function (err) {
            if (err) {
              callback({message: "Error updating organization: " + err}, null);
            }
            else {
              callback();
            }
          });
        })
      );

    } else if (!organization) {
      return callback({message: "Organization with ID " + req.body.orgId.value + " could not be updated because it was not found in the database."});
    }
  });
};

orgController.getClients = function (req, res, callback) {

  if (typeof(callback) !== 'function') {
    return;
  }
  findDisplayable(orgRoles.client, function (err, clients) {
    if (err) {
      return callback({error: "Error: " + err});
    }
    else if (clients.length !== 0) {
      return callback(clients);
    }
    else if (clients.length === 0) {
      return callback({error: "There are no organizations categorized as clients in the database."});
    }
  });
};

orgController.getClientsByOffset = function (req, res, callback) {
  if (typeof(callback) !== 'function') {
    return;
  } else if (!req.params.offset || !req.params.size) {
    return callback({error: "Missing function arguments."});
  }

  var offset = req.params.offset;
  var size = req.params.size;

  // Sort alphabetically from a to z based on the organization names
  findDisplayable(orgRoles.client, function (err, clients) {
    if (err) {
      return callback({error: "Error: " + err});
    }
    else if (clients.length !== 0) {
      return callback(clients.slice(offset, offset + size));
    }
    else if (clients.length === 0) {
      return callback({error: "There are no organizations categorized as clients in the database."});
    }
  });
};

orgController.getProviders = function (req, res, callback) {
  if (typeof(callback) !== 'function') {
    return;
  }
  findDisplayable(orgRoles.provider, function (err, providers) {
    if (err) {
      return callback({error: "Error: " + err});
    }
    else if (providers.length !== 0) {
      return callback(providers);
    }
    else if (providers.length === 0) {
      return callback({error: "There are no organizations categorized as providers in the database."});
    }
  });
};

orgController.getProvidersByOffset = function (req, res, callback) {
  if (typeof(callback) !== 'function') {
    return;
  } else if (!req.params.offset || !req.params.size) {
    return callback({error: "Missing function arguments."});
  }

  var offset = req.params.offset;
  var size = req.params.size;

  // Sort alphabetically from a to z based on the organization names
  findDisplayable(orgRoles.provider, function (err, providers) {
    if (err) {
      return callback({error: "Error: " + err});
    } else if (providers.length !== 0) {
      return callback(providers.slice(offset, offset + size));
    } else if (providers.length === 0) {
      return callback({error: "There are no organizations categorized as providers in the database."});
    }
  });
};

orgController.user = {};
orgController.user.update = {};
orgController.user.update.get = function (req, res) {
};
orgController.user.update.post = function (req, res) {
};

orgController.organization = {};
orgController.organization.get = function (req, res) {
  orgController.getOrganizationByUrlFriendlyName(req, res, function (object, err) {
    if (err) {
      res.render('organization/user-organization-view', {
        title: 'Page Request Error',
        message: "We're sorry, there was an error retrieving the requested page.",
        isAlert: true
      });
    }
    else if (!object) {
      res.render('organization/user-organization-view', {
        title: 'No Organization Found',
        message: "No organization was found."
      });
    }
    else {
      Capabilities.find({orgRef: object._id}, function (findErr, capabilitiesDoc) {
        if (!err) {
          res.render('organization/user-organization-view', {
            title: object.orgName + 'Details',
            organization: object,
            products: capabilitiesDoc
          });
        }
        else {
          res.render('organization/user-organization-view', {
            title: object.orgName + 'Details',
            message: object.error,
            products: capabilitiesDoc,
            isAlert: true
          });
        }
      });
    }
  });
};

orgController.image = {
  get: function (req, res) {
    docHlpr.getDataFromS3(req, res, '/images/organizations');
  }
};

orgController.list = {};
orgController.list.organizations = {};
orgController.list.organizations.get = function (req, res) {
  findDisplayableSorted('all', function (err, oldOrgs, newOrgs) {
    if (err) {
      res.render('organization/user-organizations-list', {
        title: 'Clients',
        message: {error: "Error: " + err},
        isAlert: true
      });
      return callback({error: "Error: " + err});
    }
    else if (oldOrgs) {
      res.render('organization/user-organizations-list', {
        title: 'Organizations',
        members: oldOrgs,
		newOrgs: newOrgs,
        memberRoles: Object.keys(orgRoles)
      });
    }
  });
};


// Admin Users

var _getAdminOrganizationsList = function (res, title, message, isAlert) {
  organizations.find().lean().exec(function (err, orgs) {
    var renderObj = {
      title: 'Organizations Administration',
      organizations: orgs
    };

    if (message !== undefined) {
      renderObj.message = message;
    }
    if (isAlert !== undefined) {
      renderObj.isAlert = isAlert;
    }
    res.render('organization/admin-list', renderObj);
  });
};

//=============================================================================
//  Admin
//=============================================================================

orgController.admin = {};
orgController.admin.list = {};

orgController.list.get = function (req, res) {
};

orgController.create = {};
orgController.create.get = function (req, res) {
};
orgController.create.post = function (req, res) {
};

orgController.update = {};
orgController.update.get = function (req, res) {
};
orgController.update.post = function (req, res) {
};

orgController.read = {};
orgController.read.get = function (req, res) {
};

orgController.admin = {};

orgController.admin.list = {};
orgController.admin.list.get = function (req, res) {
  _getAdminOrganizationsList(res, 'Organizations Administration');
};
orgController.admin.list.isApproved = function (req, res) {
  organizations.findById(req.body.id, function (err, doc) {
    if (doc) {
      doc.approved = req.body.approved;

      if (isDisplayable(doc, function (isDisplayableBoolean) {

          doc.displayable = isDisplayableBoolean || false;

          doc.save(function (saveErr) {
            if (saveErr) {
              res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'Cannot mark the organization approved.'});
            }
            else if (doc.approved) {
              res.status(httpStatus.ACCEPTED).json({message: 'Organization is marked approved'});
            } else {
              res.status(httpStatus.ACCEPTED).json({message: 'Organization is not approved.'});
            }
          });
        }));
    }
  });
};

orgController.admin.create = {};
orgController.admin.create.get = function (req, res) {
  res.render('organization/admin-create', {
    title: 'Organization Create',
    _id: req.params.id,
    organization: {}
  });
};

orgController.admin.create.post = function (req, res) {
  orgController.createOrganization(req, res, function (response) {
    if (response) {
      res.render('organization/admin-create', {
        title: 'Organization create',
        _id: req.params.id,
        organization: organization,
        error: response.error
      });
    }
    else {
      _getAdminOrganizationsList(res, 'Organizations Administration');
    }
  });
};

orgController.admin.read = {};
orgController.admin.read.get = function (req, res) {
  orgController.getOrganizationByUrlFriendlyName(req, res, function (organization, err) {
    if (err) {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'Organization lookup failed.'});
    }
    else if (organization) {
      res.render('organization/admin-view', {
        title: 'Organization View',
        _id: req.params.id,
        organization: organization
      });
    }
    else if (!organization) {
      res.status(httpStatus.NO_CONTENT).json({message: 'Organization not found.'});
    }
  });
};

orgController.admin.update = {};
orgController.admin.update.get = function (req, res) {
  orgController.getOrganizationByUrlFriendlyName(req, res, function (organization, err) {
    if (err) {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'Organization lookup failed.'});
    }
    else if (organization) {
      res.render('organization/admin-update', {
        title: 'Organization Update',
        organization: organization
      });
    }
    else if (!organization) {
      res.status(httpStatus.NO_CONTENT).json({message: 'Organization not found.'});
    }
  });
};

orgController.admin.update.post = function (req, res) {
  orgController.getOrganizationByUrlFriendlyName(req, res, function (organization, err) {
    if (err) {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'Organization lookup failed.'});
    }
    else if (organization) {
      orgController.updateOrganization(req, res, true, function (response) {
        if (response) {
          res.render('organization/admin-update', {
            title: 'Organization Update',
            organization: organization,
            message: response.message
          });
        }
        else {
          //_getAdminOrganizationsList(res, 'Organizations Administration');
          res.redirect('/admin/organizations');
        }
      });
    }
    else if (!organization) {
      res.status(httpStatus.NO_CONTENT).json({message: 'Organization not found.'});
    }
  });
};

orgController.admin.delete = {};
orgController.admin.delete.get = function (req, res) {
  orgController.getOrganizationByUrlFriendlyName(req, res, function (organization, err) {
    if (err) {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'Organization lookup failed.'});
    }
    else if (organization) {
      res.render('organization/admin-delete', {
        title: 'Organization Delete',
        orgName: organization.orgName,
        urlFriendlyID: organization.urlFriendlyID
      });
    }
    else if (!organization) {
      res.status(httpStatus.NO_CONTENT).json({message: 'Organization not found.'});
    }
  });
};

orgController.admin.delete.post = function (req, res) {
  orgController.getOrganizationByUrlFriendlyName(req, res, function (organization, err) {
	communityModel.find({members: organization._id}, function (error, communityDoc) {
        
    if (err) {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'Organization lookup failed.'});
    }
    else if (organization) {
	for (var i = 0; i < communityDoc.length; i++) {
          var memberID = communityDoc[i].members.indexOf(organization._id);
          if (memberID > -1) {
            communityDoc[i].members.splice(memberID, 1);
          }
          communityDoc[i].save(function (saveErr) {
            if (saveErr) {
              logger.error(saveErr);
            }
          });
        }
      organization.remove();
    }
    else if (!organization) {
      res.status(httpStatus.NO_CONTENT).json({message: 'Organization not found.'});
    }
    res.redirect('/admin/organizations');
  });
  });
};

module.exports = orgController;
