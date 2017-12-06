var capabilitiesModel = require('../models/products').model,
  capabilityCreator = require('../models/products').creator,
  Organizations = require('../models/organizations').model,
  httpStatus = require('http-status'),
  fs = require('fs'),
  path = require('path'),
  cfg = require('../config'),
  validator = require('../utils/validation'),
  logger = require('../utils/logger'),
  docHlpr = require('../utils/documentHelper'),
  disqusSSO = require('../utils/disqus.js'),
  mongoose = require('mongoose'),
  objectTools = require('../utils/objectTools'),
  community = require('../models/communities'),
  stringHelpers = require('../utils/stringHelpers'),
  communityModel = community.model,
  Schema = mongoose.Schema;

var capabilityController = {};
var saveDataUrl = docHlpr.saveDataUrl;

var _getUserCapabilityLists = function (req, res, modalMsg, productSubmitted, formData, view, title) {
  //Only Show approved products for users.
  capabilitiesModel.find({approved: true}).sort("name").exec(function (e, docs) {

    var normalizedProductDocs = [];
    for (var i = 0; i < docs.length; i++) {
      docs[i].capabilityNameSort = docs[i].name.toLowerCase();
      normalizedProductDocs.push(docs[i]);
    }

    docs = objectTools.sortByKey(docs, 'capabilityNameSort');

    Organizations.find({}, function (e, orgDocs) {
      if (e) {
        logger.error(e);
        res.render('error', {message: res.locals.strings.Capabilities.Messages.ErrorRetrievingCapabilities});
      }
      var responseObj = {
        products: docs,
        orgs: orgDocs,
        filters: [
          {value: res.locals.strings.Capabilities.Filters.Analytics},
          {value: res.locals.strings.Capabilities.Filters.Collaboration},
          {value: res.locals.strings.Capabilities.Filters.CyberSecurity},
          {value: res.locals.strings.Capabilities.Filters.GIS},
          {value: res.locals.strings.Capabilities.Filters.Imaging},
          {value: res.locals.strings.Capabilities.Filters.Infrastructure},
          {value: res.locals.strings.Capabilities.Filters.Modeling},
          {value: res.locals.strings.Capabilities.Filters.RemoteSensing},
          {value: res.locals.strings.Capabilities.Filters.Search},
          {value: res.locals.strings.Capabilities.Filters.Visualization}
        ]
      };

      if (formData) {
        responseObj.capabilityFormData = formData;
      }

      if (title) {
        responseObj.title = title;
      }
      else {
        responseObj.title = res.locals.strings.Capabilities.Title;
      }

      if (modalMsg !== undefined) {
        responseObj.modalMsg = modalMsg;
      }

      if (productSubmitted !== undefined) {
        responseObj.productSubmitted = productSubmitted;
      }
      if (view) {
        res.render(view, responseObj);
      }
      else {
        return;
      }
    });
  });
};

var _getAdminCapabilityList = function (res, title, message, isAlert) {
  capabilitiesModel.find({}, function (err, docs) {
    Organizations.find({}, function (orgErr, orgDocs) {
      if (orgErr) {
        logger.error(orgErr);
      }
      var renderObj = {
        title: res.locals.strings.Capabilities.TitleAdmin,
        products: docs,
        organizations: orgDocs
      };

      if (message !== undefined) {
        renderObj.message = message;
      }
      if (isAlert !== undefined) {
        renderObj.isAlert = isAlert;
      }
      res.render('product/admin-list', renderObj);

    });
  });
};

var _reportError = function (err, method, args) {
  logger.error(err);
  method.apply(null, args);
};

// Basic Users
capabilityController.user = {};
capabilityController.org = {};
capabilityController.user.list = {
  get: function (req, res) {
    _getUserCapabilityLists(req, res);
  },
  post: function (req, res) {
    var logoFile = undefined;
    if (req.body.uploadLogoURI) {
      saveDataUrl(cfg.imageUploadDir + '/logo_' + req.body.capabilityName, req.body.uploadLogoURI);
      var extension = req.body.uploadLogoURI.match(/\/(.*)\;/)[1];
      logoFile = cfg.capabilitiesImageURL + '/logo_' + req.body.capabilityName + '.' + extension;
    } else if (req.body.uploadLogoURI2) {
      saveDataUrl(cfg.imageUploadDir + '/logo_' + req.body.capabilityName, req.body.uploadLogoURI2);
      var extension = req.body.uploadLogoURI2.match(/\/(.*)\;/)[1];
      logoFile = cfg.capabilitiesImageURL + '/logo_' + req.body.capabilityName + '.' + extension;
    }

    var categories;
    if (req.body.category) {
      categories = req.body.category.split(',');
      // Format the category strings
      for (var i in categories) {
        categories[i] = categories[i].toLowerCase().trim();
        categories[i] = categories[i].replace(/  +/g, ' ');

        var separatedWords = categories[i].split(' ');
        categories[i] = '';
        for (var j in separatedWords) {
          separatedWords[j] = separatedWords[j].charAt(0).toUpperCase() + separatedWords[j].slice(1);
        }
        categories[i] = separatedWords.join(' ');
      }
    } else if (req.body.category2) {
      categories = req.body.category2.split(',');
      // Format the category strings
      for (var i in categories) {
        categories[i] = categories[i].toLowerCase().trim();
        categories[i] = categories[i].replace(/  +/g, ' ');

        var separatedWords = categories[i].split(' ');
        categories[i] = '';
        for (var j in separatedWords) {
          separatedWords[j] = separatedWords[j].charAt(0).toUpperCase() + separatedWords[j].slice(1);
        }
        categories[i] = separatedWords.join(' ');
      }
    }
    capabilityCreator(true, req.body.capabilityName, res.locals.userinfo.orgRef, req.body.pocName, req.body.pocEmail,
      req.body.capabilityDescription, categories, req.body.webLink, logoFile,
      function (err, productDoc) {
        if (err) {
          logger.error(err);
          _getUserCapabilityLists(req, res, err.message, false, req.body);
        }
        else {

          if (res.locals.userinfo.orgRef) {
            communityModel.find({$or: [{members: res.locals.userinfo.orgRef}, {owner: res.locals.userinfo.orgRef}]}, function (findErr, doc) {
              Organizations.findOne({_id: res.locals.userinfo.orgRef}, function (findErr, org) {
                if (doc) {
                  var capabilityId = productDoc._id;
                  if (!doc.solutions) {
                    doc.solutions = [];
                  }
                  for (var i = 0; i < doc.length; i++) {
                    if (doc[i].solutions.indexOf(capabilityId) === -1) {

                      doc[i].solutions.push(capabilityId);
                      doc[i].save(function (saveErr) {
                      });
                    }
                  }
                }
                var namePattern = stringHelpers.getUrlFriendlyString(req.body.capabilityName);
                var capabilityInfo = [];
                capabilityInfo.push(req.body);
                capabilityInfo.push(logoFile);
                capabilityInfo.push(org.orgName);
                capabilityInfo.push(namePattern);
                capabilityInfo.push(productDoc._id);
                capabilityInfo.push(productDoc.logoUrl);
                capabilityInfo.push(productDoc.name);


                res.send(capabilityInfo);
              });
            });
          }
        }
      });

  }
};

capabilityController.user.image = {
  get: function (req, res) {
    docHlpr.getDataFromS3(req, res, '/images/products');
  }
};

capabilityController.user.update = {
  get: function (req, res) {
    capabilitiesModel.findOne({'_id': req.params.id, 'orgRef': req.user.orgRef}, function (err, doc) {
      if (err) {
        logger.error(err);
        _getAdminCapabilityList(res, res.locals.strings.Capabilities.TitleAdmin, res.locals.strings.Capabilities.Messages.FailToRetrieveCapability, true);
      }

      if (!doc) {
        //TODO
      }
      res.render('product/user-update', {
        title: res.locals.strings.Capabilities.TitleAdminUpdate,
        product: doc
      });
    });
  },
  post: function (req, res) {

    capabilitiesModel.findOne({'_id': req.params.id, 'orgRef': req.user.orgRef}, function (err, doc) {
      if (err) {
        logger.error(err);
        _getAdminCapabilityList(res, res.locals.strings.Capabilities.TitleAdmin, res.locals.strings.Capabilities.Messages.FailToRetrieveCapability, true);
      }

      if (!doc) {
        //TODO
      }

      if (validator.isValidEmailAddress(req.body.pocEmail)) {
        doc.pocEmail = req.body.pocEmail;
      }
      else {
        res.render('product/admin-update', {
          title: res.locals.strings.Capabilities.TitleAdminUpdate,
          message: res.locals.strings.Capabilities.InvalidEmail,
          successful: false,
          product: doc
        });
      }

      if (validator.isValidWebLink(req.body.webLink)) {
        doc.webLink = req.body.webLink;
      } else {
        res.render('product/admin-update', {
          title: res.locals.strings.Capabilities.TitleAdminUpdate,
          message: res.locals.strings.Capabilities.TitleAdminUpdate.InvalidUrl,
          successful: false,
          product: doc
        });
      }


      doc.name = req.body.capabilityName;
      doc.urlFriendlyID = stringHelpers.getUrlFriendlyString(req.body.capabilityName);

      doc.pocName = req.body.pocName;
      doc.description = req.body.capabilityDescription.trim();
      if (req.body.category) {
        doc.category = req.body.category.split(',');
      }


      if (req.body.uploadLogoURI) {
        saveDataUrl(cfg.imageUploadDir + '/logo_' + doc.urlFriendlyID, req.body.uploadLogoURI);
        var extension = req.body.uploadLogoURI.match(/\/(.*)\;/)[1];
        doc.logoUrl = cfg.capabilitiesImageURL + '/logo_' + doc.urlFriendlyID + '.' + extension;
      }

      doc.save(function (saveErr) {
        if (saveErr) {
          logger.error(saveErr);
          res.render('product/user-update', {
            title: res.locals.strings.Capabilities.TitleUserUpdate,
            message: res.locals.strings.Capabilities.Messages.FailedUpdate,
            successful: false,
            product: doc
          });
        }
        else {
          res.render('product/user-update', {
            title: res.locals.strings.Capabilities.TitleUserUpdate,
            message: res.locals.strings.Capabilities.Messages.SuccessfulUpdate,
            successful: true,
            product: doc
          });
        }
      });
    });
  }
};
capabilityController.org.update = {
  get: function (req, res) {
    capabilitiesModel.findOne({'_id': req.params.id, 'orgRef': req.user.orgRef}, function (err, doc) {
      if (err) {
        logger.error(err);

      }

      res.send(doc);
    });
  },
  post: function (req, res) {

    capabilitiesModel.findOne({'_id': req.params.id, 'orgRef': req.user.orgRef}, function (err, doc) {
      if (err) {
        logger.error(err);
        _getAdminCapabilityList(res, res.locals.strings.Capabilities.TitleAdmin, res.locals.strings.Capabilities.Messages.FailToRetrieveCapability, true);
      }

      if (!doc) {
        //TODO
      }

      if (validator.isValidEmailAddress(req.body.pocEmail)) {
        doc.pocEmail = req.body.pocEmail;
      }


      if (validator.isValidWebLink(req.body.webLink)) {
        doc.webLink = req.body.webLink;
      }


      doc.name = req.body.capabilityName;
      doc.urlFriendlyID = stringHelpers.getUrlFriendlyString(req.body.capabilityName);

      doc.pocName = req.body.pocName;
      doc.description = req.body.capabilityDescription.trim();
      if (req.body.category) {
        doc.category = req.body.category.split(',');
      }


      if (req.body.uploadLogoURI) {
        saveDataUrl(cfg.imageUploadDir + '/logo_' + doc.urlFriendlyID, req.body.uploadLogoURI);
        var extension = req.body.uploadLogoURI.match(/\/(.*)\;/)[1];
        doc.logoUrl = cfg.capabilitiesImageURL + '/logo_' + doc.urlFriendlyID + '.' + extension;
      }

      doc.save(function (saveErr) {
        if (saveErr) {
          logger.error(saveErr);
          res.render('product/user-update', {
            title: res.locals.strings.Capabilities.TitleUserUpdate,
            message: res.locals.strings.Capabilities.Messages.FailedUpdate,
            successful: false,
            product: doc
          });
        }
        else {
          res.send(doc);
        }
      });
    });
  }
};
capabilityController.user.discuss = {
  get: function (req, res) {
    capabilitiesModel.findOne({'urlFriendlyID': req.params.name}, function (err, doc) {
      if (err) {
        res.render('product/disqus', {
          title: 'Page Request Error',
          message: "We're sorry, there was an error retrieving the requested page.",
          isAlert: true
        });
      }
      else if (!doc) {
        res.render('product/disqus', {
          title: 'No Capability Found',
          message: "No capability was found."
        });
      }
      else {
        Organizations.findOne({_id: doc.orgRef}, function (findErr, org) {
          if (err) {
            logger.error(err);
            _getAdminCapabilityList(res, res.locals.strings.Capabilities.TitleAdmin, res.locals.strings.Capabilities.Messages.FailToRetrieveCapability, true);
          }

          if (!doc) {
            //TODO
          }
          res.render('product/disqus', {
            title: res.locals.strings.Capabilities.Disqus.Title,
            product: doc,
            disqusSSO: disqusSSO.getDisqusSSO(res),
            disqusShortName: cfg.disqus.shortname,
            uniqueID: doc._id,
            organization: org
          });
        });
      }
    });
  }
};
capabilityController.user.delete = {
  get: function (req, res) {
    capabilitiesModel.findOne({'_id': req.params.id, 'orgRef': req.user.orgRef}, function (err, doc) {
      if (err) {
        logger.error(err);
        _getAdminCapabilityList(res, res.locals.strings.Capabilities.TitleAdmin, res.locals.strings.Capabilities.Messages.FailToRetrieveCapability, true);
      }

      if (!doc) {
        //TODO
      }
      res.render('product/user-delete', {
        title: res.locals.strings.Capabilities.TitleAdminUpdate,
        product: doc
      });
    });
  },
  post: function (req, res) {
    capabilitiesModel.findOne({'_id': req.params.id, 'orgRef': req.user.orgRef}, function (err, doc) {
      communityModel.find({solutions: doc._id}, function (error, communityDoc) {
        for (var i = 0; i < communityDoc.length; i++) {
          var capabilityId = communityDoc[i].solutions.indexOf(doc._id);
          if (capabilityId > -1) {
            communityDoc[i].solutions.splice(capabilityId, 1);
          }
          communityDoc[i].save(function (saveErr) {
            if (saveErr) {
              logger.error(saveErr);
            }
          });
        }

        if (err) {
          logger.error(err);
          _getAdminCapabilityList(res, res.locals.strings.Capabilities.TitleAdmin, res.locals.strings.Capabilities.Messages.FailToRetrieveCapability, true);
        }
        doc.remove(function (err) {
          res.redirect('/profile/' + req.user.username + '/manage#products');
        });
      });
    });
  }
};

// Admin Users
capabilityController.admin = {};
capabilityController.admin.list = {
  get: function (req, res) {
    _getAdminCapabilityList(res, res.locals.strings.Capabilities.TitleAdmin);
  }
};

capabilityController.admin.update = {
  get: function (req, res) {
    capabilitiesModel.findById(req.params.id, function (err, doc) {
      if (err) {
        logger.error(err);
        _getAdminCapabilityList(res, res.locals.strings.Capabilities.TitleAdmin, res.locals.strings.Capabilities.Messages.FailToRetrieveCapability, true);
      }

      if (!doc) {
        capabilitiesModel.find({}, function (err, docs) {
          _getAdminCapabilityList(res, res.locals.strings.Capabilities.TitleAdmin, res.locals.strings.Capabilities.Messages.NoCapabilityMatch, true);
        });
      }
      Organizations.find({}, function (err, orgs) {
        res.render('product/admin-update', {
          title: res.locals.strings.Capabilities.TitleAdminUpdate,
          product: doc,
          organizations: orgs
        });
      });
    });
  },
  post: function (req, res) {
    capabilitiesModel.findById(req.params.id, function (err, doc) {
      Organizations.find({}, function (err, orgs) {
        doc.name = req.body.capabilityName;
        doc.urlFriendlyID = stringHelpers.getUrlFriendlyString(req.body.capabilityName);
        doc.orgRef = req.body.orgRef;
        doc.organization = req.body.orgName;
        doc.pocName = req.body.pocName;
        doc.description = req.body.capabilityDescription.trim();

        if (req.body.category) {
          doc.category = req.body.category.split(',');
        }


        if (req.body.uploadLogoURI) {
          saveDataUrl(cfg.imageUploadDir + '/logo_' + doc.urlFriendlyID, req.body.uploadLogoURI);
          var extension = req.body.uploadLogoURI.match(/\/(.*)\;/)[1];
          doc.logoUrl = cfg.capabilitiesImageURL + '/logo_' + doc.urlFriendlyID + '.' + extension;
        }
        doc.save(function (saveErr) {
          if (saveErr) {
            logger.error(saveErr);
            res.render('product/admin-update', {
              title: res.locals.strings.Capabilities.TitleAdminUpdate,
              message: res.locals.strings.Capabilities.Messages.FailedUpdate,
              successful: false,
              product: doc,
              organizations: orgs
            });
          }
          else {
            res.render('product/admin-update', {
              title: res.locals.strings.Capabilities.TitleAdminUpdate,
              message: res.locals.strings.Capabilities.Messages.SuccessfulUpdate,
              successful: true,
              product: doc,
              organizations: orgs
            });
          }
        });
      });
    });
  }
};

capabilityController.admin.create = {
  get: function (req, res) {
    Organizations.find({}, function (err, orgs) {
      res.render('product/admin-create', {
        title: res.locals.strings.Capabilities.TitleNew,
        organizations: orgs
      });
    });
  },
  post: function (req, res) {
    var logoFile = undefined;
    if (req.body.uploadLogoURI) {
      saveDataUrl(cfg.imageUploadDir + '/logo_' + req.body.capabilityName, req.body.uploadLogoURI);
      var extension = req.body.uploadLogoURI.match(/\/(.*)\;/)[1];
      logoFile = cfg.capabilitiesImageURL + '/logo_' + req.body.capabilityName + '.' + extension;
    }
    var categories = [];
    if (req.body.category) {
      categories = req.body.category.split(',');
    }
    capabilityCreator(req.body.approved, req.body.capabilityName, req.body.orgRef, req.body.pocName, req.body.pocEmail,
      req.body.capabilityDescription, categories, req.body.webLink, logoFile,
      function (err, productDoc) {
        if (err) {
          logger.error(err);
          Organizations.find({}, function (orgErrs, orgs) {
            res.render('product/admin-create', {
              title: res.locals.strings.Capabilities.TitleNew,
              organizations: orgs,
              message: err.message,
              isAlert: true,
              formData: productDoc
            });
          });
        }
        else {
          res.redirect('/admin/capabilities/' + productDoc.id);
        }
      }
    );
  }
};

capabilityController.admin.delete = {
  get: function (req, res) {
    capabilitiesModel.findOne({'_id': req.params.id}, function (err, doc) {
      if (err) {
        logger.error(err);
        _getAdminCapabilityList(res, res.locals.strings.Capabilities.TitleAdmin, res.locals.strings.Capabilities.Messages.FailToRetrieveCapability, true);
      }

      if (!doc) {
        capabilitiesModel.find({}, function (findError) {
          if (findError) {
            logger.error(findError);
          }
          _getAdminCapabilityList(res, res.locals.strings.Capabilities.TitleAdmin, res.locals.strings.Capabilities.Messages.NoCapabilityMatch, true);
        });
      } else if (doc) {
        res.render('product/admin-delete', {title: res.locals.strings.Capabilities.TitleDelete, product: doc});
      }
    });
  },
  post: function (req, res) {
    capabilitiesModel.findOne({'_id': req.params.id}, function (err, doc) {
      communityModel.find({solutions: doc._id}, function (error, communityDoc) {
        for (var i = 0; i < communityDoc.length; i++) {
          var capabilityId = communityDoc[i].solutions.indexOf(doc._id);
          if (capabilityId > -1) {
            communityDoc[i].solutions.splice(capabilityId, 1);
          }
          communityDoc[i].save(function (saveErr) {
            if (saveErr) {
              logger.error(saveErr);
            }
          });
        }
        if (err) {
          logger.error(err);
          _getAdminCapabilityList(res, res.locals.strings.Capabilities.TitleAdmin, res.locals.strings.Capabilities.Messages.FailToRetrieveCapability, true);
        }
        doc.remove(function (err) {
          res.redirect('/admin/capabilities');
        });
      });
    });
  }
};

capabilityController.admin.view = {
  get: function (req, res) {
    capabilitiesModel.findById(req.params.id, function (err, doc) {
      if (err) {
        _reportError(err, _getAdminCapabilityList, [res, res.locals.strings.Capabilities.TitleAdmin, res.locals.strings.Capabilities.Messages.FailToRetrieveCapability, true]);
        return;
      }

      if (!doc) {
        _reportError(err, _getAdminCapabilityList, [res, res.locals.strings.Capabilities.TitleAdmin, res.locals.strings.Capabilities.Messages.NoCapabilityMatch, true]);
        return;
      }

      Organizations.findOne({'_id': doc.orgRef}, function (orgErr, org) {
        if (orgErr) {
          _reportError(orgErr,
            _getAdminCapabilityList,
            [res, res.locals.strings.Capabilities.TitleAdmin, res.locals.strings.Capabilities.Messages.FailToRetrieveCapability, true]);
          return;
        }
        res.render('product/admin-view', {
          title: res.locals.strings.Capabilities.TitleAdminView,
          product: doc,
          organization: org
        });
      });
    });
  }
};

capabilityController.api = {
  isApproved: function (req, res) {
    capabilitiesModel.findById(req.body.id, function (err, doc) {
      if (doc) {
        doc.approved = req.body.approved;
        doc.save(function (saveErr) {
          if (saveErr) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: res.locals.strings.Capabilities.Messages.CannotApprove});
          }
          else if (doc.approved) {
            res.status(httpStatus.ACCEPTED).json({message: res.locals.strings.Capabilities.Messages.Approved});
          } else {
            res.status(httpStatus.ACCEPTED).json({message: res.locals.strings.Capabilities.Messages.NotApproved});
          }
        });
      }
    });
  }
};

module.exports = capabilityController;
