var auth = require('../auth');

var signupController = {user: {getUserInformation: {}}};


signupController.user.getUserInformation.get = function (req, res) {
  var userInfo = {
    userid: req.params.user,
    tempPassword: req.params.tempPassword
  };
  // first lets make sure this user data is valid by authenticating with it
  auth.deserializeUser(userInfo.userid, function (err, user) {
    if (!err) {
      auth.checkUserPassword(user, userInfo.tempPassword, function (isPassValid) {
        if (isPassValid) {
          res.render('account/pass_reset', {
            user: {id: userInfo.userid},
            message: 'Please set your initial password to finalize your account.'
          });
        }
        else { // this accounts password has already been reset, so scrub off
          res.render('account/account_already_activated');
        }
      });
    } else {
      res.redirect('/');
    }
  });
};

module.exports = signupController;