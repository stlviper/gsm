var express = require('express'),
  router = express.Router(),
  auth = require('../auth'),
  accounts = require('../models/accounts').model,
  signUpController = require('../controllers/welcome'),
  accountController = require('../controllers/account');

router.get('/:user/:tempPassword', signUpController.user.getUserInformation.get);
router.post('/:user/:tempPassword', accountController.resetPassword.post);


module.exports = router;
