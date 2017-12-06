/*var organizations = require('./organization')
  , accounts = require('../models/accounts').model,
  async = require('async'),
  crypto = require('crypto'),
  stringHelper = require('../utils/stringHelpers'),
  emailer = require('../utils/emailer'),
  config = require('../config');*/

//NOTE: This has only been kept around for historical purpse. Can be deleted after next release.
module.exports = {
 /* forgotPass: function (req, res) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        accounts.findOne({ email: req.body.email }, function(err, user) {
          if (!user) {
            return res.render('account/forgot_pass', {error: 'No account with that email address exists.'});
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var resetUrl = 'http://' + req.headers.host + '/reset/' + token;
        var mailOptions = {
          to: user.email,
          from: config.helpDeskEmail,
          subject: res.locals.strings.Emails.userPasswordReset.subject,
          text: stringHelper.format(res.locals.strings.Emails.userPasswordReset.text, resetUrl)
        };
        emailer.sendEmail(mailOptions);
        done(null, {info: 'An e-mail has been sent to ' + user.email + ' with further instructions.'}, 'done');
      }
    ], function(err, message) {
      if (err) return next(err);
      res.render('account/forgot_pass', message);
    });
  },

  forgotReset: function(req, res) {
    async.waterfall([
      function(done){
        accounts.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            res.render('account/pass_reset', {forgot: true, error: 'Password reset token is invalid or has expired.'});
          } else {
            res.render('account/pass_reset', {forgot: true, user: user, currentRoute: 'welcome'});
          }
        });
      },
      function(err, user){
        return res.redirect('/profile/' + user.username + '/manage');
      }
    ]);
  }*/
};