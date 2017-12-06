var express = require('express'),
  auth = require('../auth'),
  cfg = require('../config'),
  joinController = require('../controllers/join'),
  org = require('../controllers/organization'),
  router = express.Router();


router.get('/get-all-organizations', auth.allowAnonymousUser, joinController.user.list.all.get);
router.post('/check-organization-name', auth.allowAnonymousUser, joinController.user.list.check.name.post);
router.get('/get-sam-gov-organization/:orgDuns', auth.allowAnonymousUser, joinController.user.list.getSamGovOrganization.get);
router.post('/check-government-email', auth.allowAnonymousUser, joinController.user.list.check.govemail.post);
router.post('/check-organization-information', auth.allowAnonymousUser, joinController.user.list.check.orgInfo.post);
router.post('/check-organization-poc-information', auth.allowAnonymousUser, joinController.user.list.check.orgPocInfo.post);

router.get('/', auth.allowAnonymousUser, function (req, res) {
  res.render('join/organizationLookup', {});
});
router.get('/lookup', auth.allowAnonymousUser, function (req, res) {
  res.render('join/organizationLookup', {});
});

router.get('/organization', auth.allowAnonymousUser, joinController.user.newOrganization.get);
router.post('/organization', auth.allowAnonymousUser, joinController.user.newOrganization.post);

router.get('/newprofile', auth.allowAnonymousUser, joinController.user.userprofile.get);
router.post('/newprofile', auth.allowAnonymousUser, joinController.user.userprofile.post);

router.get('/tos', auth.allowAnonymousUser, joinController.user.tos.get);
router.post('/tos', auth.allowAnonymousUser, joinController.user.tos.post);

router.get('/complete', auth.allowAnonymousUser, joinController.user.finished.get);

router.get('/pocapprove/:id', auth.allowAnonymousUser, joinController.user.pocApprove.get);
router.post('/pocapprove', auth.allowAnonymousUser, joinController.user.pocApprove.post);

router.get('/pocdeny/:id', auth.allowAnonymousUser, joinController.user.pocDeny.get);
router.post('/pocdeny', auth.allowAnonymousUser, joinController.user.pocDeny.post);

router.get('/status', auth.allowAnonymousUser, function (req, res) {
  res.render('join/status', {});
});


module.exports = router;