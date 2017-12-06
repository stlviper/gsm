var express = require('express'),
  apiController = require('../controllers/apiController'),
  registrationController = require('../controllers/registration');
  router = express.Router();
  docHlpr = require('../utils/documentHelper');
  
function testAPIKey(req, res, next) {
  if (req.params.key.toLowerCase() !== res.locals.siteConfig.apiKey) {
    res.redirect('/');
  } else {
    next();
  }
}

router.get('/:key', testAPIKey, apiController.endpoints.get);
router.get('/:key/all', testAPIKey, apiController.all.get);
router.get('/:key/all/organizations', testAPIKey, apiController.all.organizations.get);
router.get('/:key/all/capabilities', testAPIKey, apiController.all.capabilities.get);
router.get('/:key/all/solution-submissions', testAPIKey, apiController.all.solutionSubmissions.get);
router.get('/:key/organizations/:urlFriendlyID', testAPIKey, apiController.organization.get);

// This will return the attachment with the same name
router.get('/:key/private/files/solution-submissions/:filename', testAPIKey, function(req, res) {
  docHlpr.getDataFromS3(req, res, '');
});
// This will return the attachment with a the new name
router.get('/:key/private/files/solution-submissions/:filename/:humanreadablefilename', testAPIKey, function(req, res) {
  docHlpr.mitreGetDataFromS3(req, res);
});

router.get('/:key/images/products/:filename', testAPIKey, function(req, res) {
  docHlpr.getDataFromS3(req, res, '');
});
router.get('/:key/images/products/:filename/:humanreadablefilename', testAPIKey, function(req, res) {
  docHlpr.mitreGetDataFromS3(req, res, '');
});

router.get('/:key/images/organizations/:filename', testAPIKey, function(req, res) {
  docHlpr.getDataFromS3(req, res, '');
});
router.get('/:key/images/organizations/:filename/:humanreadablefilename', testAPIKey, function(req, res) {
  docHlpr.mitreGetDataFromS3(req, res, '');
});

module.exports = router;