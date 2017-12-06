var cfg = require('../config'),
  mongoose = require('mongoose'),
  mongoosastic = require('mongoosastic'),
  passport = require('passport'),
  Schema = mongoose.Schema,
  bCrypt = require('bcrypt-nodejs'),
  objHlpr = require('../utils/objectTools'),
  stringHlpr = require('../utils/stringHelpers'),
  logger = require('../utils/logger');

var accountRoles = {Admin: 'admin', User: 'user', OrgManager: 'organizationManager', discoveryManager: 'discoveryManager', discoveryEvaluator: 'discoveryEvaluator'};

var accountsSchema = new Schema({
  username: {type: String, required: true, trim: true, index: {unique: true}},
  password: {type: String, required: true, trim: true},
  firstName: {type: String, required: true, trim: true},
  orgRef: {type: Schema.Types.ObjectId, required: false},
  lastName: {type: String, required: true, trim: true},
  phoneNumber: {type: String, required: false, default: "", trim: true},
  email: {type: String, required: true, trim: true, unique: true},
  roles: [{type: String, required: false, enum: objHlpr.getValues(accountRoles), trim: false}],
  passwordExpired: {type: Boolean, required: true, default: false},
  approved: {type: Boolean, required: true, default: false},
  verifiedAccount: {type: Boolean, required: true, default: false},
  dateAdded: {type: Date, required: false, default: Date.now()},
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogon: {type: Date, required: false},
  lastChatLogon: {type: Date, required: false},
  lastChatLogout: {type: Date, required: false},
  lastActive: {type: Date, required: false},
  conversationNotificationEmailsEnabled: {type: Boolean, required: false}
});


accountsSchema.set('toObject', {getters: true, virtuals: true});

accountsSchema.set('toJSON', {getters: true, virtuals: true});

accountsSchema.virtual('lastNameNormalized').get(function () {
  return this.lastName.toLowerCase();
});

accountsSchema.plugin(mongoosastic, {host: String(cfg.es.uri)});

var accounts = mongoose.model('accounts', accountsSchema);

var _createHash = function (password) {
  return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};

var validate = function (model, callback) {
  callback(null, model);
};

var _setDefaultPermissions = function (userAccount, organization, callback) {
  userAccount.roles.push(accountRoles.User);
  accounts.find({'orgRef': organization._id}, function (orgAccountError, orgAccounts) {
    if (orgAccountError) {
      logger.error(orgAccountError);
      callback(orgAccountError);
    }
    else if (orgAccounts.length === 1 && orgAccounts[0].email.toLowerCase() === userAccount.email.toLowerCase()) {
      //NOTE: There will be one user in the database which is the new user.
      userAccount.roles.push(accountRoles.OrgManager);
      userAccount.approved = true;
      userAccount.verifiedAccount = true;
    }
    userAccount.save(function (err) {
      callback(err, userAccount);
    });
  });
};

var creator = function (username, password, email, firstName, lastName, phoneNumber, organization, callback) {

  var newUser = new accounts();
  newUser.username = stringHlpr.removeWhitespace(username).toLowerCase();
  newUser.password = _createHash(password);
  if (organization) {
    newUser.orgRef = organization._id;
  }
  newUser.email = email;
  newUser.firstName = firstName;
  newUser.lastName = lastName;
  newUser.roles = [];
  newUser.phoneNumber = phoneNumber;
  newUser.lastLogin = null;

  // find out whether a duplicate username exists and append
  // a number to the end if it exists
  accounts.find({'email': newUser.email}, function (userFindErr, users) {
    if (userFindErr) {
      callback(userFindErr, newUser);
    } else {
      if (users.length > 0) {
        newUser.username = username + users.length;
      }
      // save the user
      newUser.save(function (saveErr) {
        if (saveErr) {
          callback(saveErr, newUser);
        }
        else {
          _setDefaultPermissions(newUser, organization, function (permissionsErr) {
            if (permissionsErr) {
              callback(permissionsErr, newUser);
            }
            else {
              callback(null, newUser);
            }
          });
        }
      });
    }
  });

};


module.exports = {
  model: accounts,
  validate: validate,
  creator: creator,
  roles: accountRoles
};