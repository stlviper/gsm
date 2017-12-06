var express = require('express'),
  auth = require('../auth'),
  accountController = require('../controllers/account'),
  capabilitiesController = require('../controllers/product'),
  logsController = require('../controllers/log'),
  problemController = require('../controllers/challenge'),
  communityController = require('../controllers/community').communityController,
  registrationsController = require('../controllers/registration'),
  cfg = require('../config'),
  org = require('../controllers/organization');


var router = express.Router();

router.get('/', auth.isAuthenticated, function (req, res) {
  res.render('admin', {});
});

//=============================================================================
// User Admin routes
//=============================================================================
router.get('/users', auth.isAuthenticated, accountController.admin.list.get);
router.post('/users/isApproved', auth.isAuthenticated, accountController.admin.list.isApproved);
router.post('/users/orgAdmin', auth.isAuthenticated, accountController.manage.orgAdmin);


router.get('/users/create', auth.isAuthenticated, accountController.admin.create.get);
router.post('/users/create', auth.isAuthenticated, accountController.admin.create.post);

router.get('/users/:username', auth.isAuthenticated, accountController.admin.read.get);

router.get('/users/:username/update', auth.isAuthenticated, accountController.admin.update.get);
router.post('/users/:username/update', auth.isAuthenticated, accountController.admin.update.post);

router.get('/users/:username/delete', auth.isAuthenticated, accountController.admin.delete.get);
router.post('/users/:username/delete', auth.isAuthenticated, accountController.admin.delete.post);


//=============================================================================
// Product Admin Routes
//=============================================================================
router.get('/capabilities/create', auth.isAuthenticated, capabilitiesController.admin.create.get);
router.post('/capabilities/create', auth.isAuthenticated, capabilitiesController.admin.create.post);


router.post('/capabilities/isApproved', auth.isAuthenticated, capabilitiesController.api.isApproved);
router.get('/capabilities/:id', auth.isAuthenticated, capabilitiesController.admin.view.get);
router.get('/capabilities/:id/update', auth.isAuthenticated, capabilitiesController.admin.update.get);
router.post('/capabilities/:id/update', auth.isAuthenticated, capabilitiesController.admin.update.post);
router.get('/capabilities/:id/delete', auth.isAuthenticated, capabilitiesController.admin.delete.get);
router.post('/capabilities/:id/delete', auth.isAuthenticated, capabilitiesController.admin.delete.post);
router.get('/capabilities', auth.isAuthenticated, capabilitiesController.admin.list.get);

//=============================================================================
// Organization Admin Routes
//=============================================================================
router.get('/organizations', auth.isAuthenticated, org.admin.list.get);
router.post('/organizations/isApproved', auth.isAuthenticated, org.admin.list.isApproved);
router.get('/organizations/create', auth.isAuthenticated, org.admin.create.get);
router.post('/organizations/create', auth.isAuthenticated, org.admin.create.post);
router.get('/organizations/:orgRouteId/update', auth.isAuthenticated, org.admin.update.get);
router.post('/organizations/:orgRouteId/update', auth.isAuthenticated, org.admin.update.post);
router.get('/organizations/:orgRouteId/delete', auth.isAuthenticated, org.admin.delete.get);
router.post('/organizations/:orgRouteId/delete', auth.isAuthenticated, org.admin.delete.post);
router.get('/organizations/:orgRouteId', auth.isAuthenticated, org.admin.read.get);

//=============================================================================
// Problems Admin Routes
//=============================================================================
router.get('/problems', auth.isAuthenticated, problemController.admin.list.get);
router.post('/problems/isApproved', auth.isAuthenticated, problemController.api.isApproved.get);
router.get('/problems/create', auth.isAuthenticated, problemController.admin.create.get);
router.post('/problems/create', auth.isAuthenticated, problemController.admin.create.post);
router.get('/problems/:id', auth.isAuthenticated, problemController.admin.read.get);
router.get('/problems/:id/solutions', auth.isAuthenticated, problemController.admin.registrations.view.get);
router.get('/problems/:id/getfields', auth.isAuthenticated, problemController.api.getCustomFields.get);
router.post('/problems/:id/updatefields', auth.isAuthenticated, problemController.api.updateCustomFields.post);
router.post('/problems/:id/updateregistrationdescription', auth.isAuthenticated, problemController.api.updateRegistrationDescription.post);
router.get('/problems/:id/update', auth.isAuthenticated, problemController.admin.update.get);
router.post('/problems/:id/update', auth.isAuthenticated, problemController.admin.update.post);
router.get('/problems/:id/delete', auth.isAuthenticated, problemController.admin.delete.get);
router.post('/problems/:id/delete', auth.isAuthenticated, problemController.admin.delete.post);


//=============================================================================
// Community Admin Routes
//=============================================================================
router.post('/communities/news/delete', auth.isAuthenticated, communityController.api.removeNewsPost.post);
router.post('/communities/activate', auth.isAuthenticated, communityController.api.activate.post);
router.post('/communities/deactivate', auth.isAuthenticated, communityController.api.deactivate.post);
router.post('/communities/delete', auth.isAuthenticated, communityController.admin.delete.post);
router.get('/communities', auth.isAuthenticated, communityController.admin.list.get);
router.get('/communities/:id/update', auth.isAuthenticated, communityController.admin.update.get);
router.post('/communities/:id/update', auth.isAuthenticated, communityController.admin.update.post);

//=============================================================================
// News Admin Routes
//=============================================================================
router.get('/news', auth.isAuthenticated, communityController.admin.news.list.get);
router.post('/news/remove-post', auth.isAuthenticated, communityController.api.admin.removeNewsPost.post);
router.get('/news/:urlNameID/:newsRouteID', auth.isAuthenticated, communityController.admin.news.update.get);
router.post('/news/:urlNameID/:newsRouteID', auth.isAuthenticated, communityController.admin.news.update.post);

//=============================================================================
// Registrations Admin Routes NOTE: This is removed from the admin nav but is still there
//=============================================================================
router.get('/solutions/', auth.isAuthenticated, registrationsController.admin.list.get);
router.post('/solutions/delete', auth.isAuthenticated, registrationsController.admin.delete.post);
router.get('/solutions/:id', auth.isAuthenticated, registrationsController.admin.view.get);
router.get('/solutions/:id/update', auth.isAuthenticated, registrationsController.admin.update.get);
router.post('/solutions/:id/update', auth.isAuthenticated, registrationsController.admin.update.post);
router.get('/solutions/:id/export', auth.isAuthenticated, registrationsController.admin.exportPDF.get);
router.get('/solutions/:id/feedback/', auth.isAuthenticated, registrationsController.admin.feedback.list.get);
router.get('/solutions/:id/feedback/:feedbackid', auth.isAuthenticated, registrationsController.admin.feedback.view.get);

if (cfg.useS3) {
  router.get('/docs/:document', auth.isAuthenticated, registrationsController.admin.document.get);
}

//=============================================================================
// Feedback Admin Routes
//=============================================================================
router.get('/solutions/:id/leavefeedback', auth.isAuthenticated, registrationsController.admin.feedback.create.get);
router.post('/solutions/:id/leavefeedback', auth.isAuthenticated, registrationsController.admin.feedback.create.post);
router.get('/solutions/:id/resumefeedback', auth.isAuthenticated, registrationsController.admin.feedback.update.get);
router.post('/solutions/:id/resumefeedback', auth.isAuthenticated, registrationsController.admin.feedback.update.post);
router.post('/solutions/:id/resumefeedback/:feedbackid/:feedbackdocumentname/deletefeedbackdocument', auth.isAuthenticated, registrationsController.admin.feedback.removeDocument.post);
router.post('/solutions/:id/resumefeedback/:feedbackid/:otherdocumentname/deleteotherdocument', auth.isAuthenticated, registrationsController.admin.feedback.removeOtherDocuments.post);

//=============================================================================
// Logs Admin Routes
//=============================================================================
router.get('/logs/:id', auth.isAuthenticated, logsController.admin.view.get);
router.post('/logs/delete', auth.isAuthenticated, logsController.admin.delete.post);
router.get('/logs', auth.isAuthenticated, logsController.admin.list.get);

module.exports = router;