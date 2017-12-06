var phone_validator = require('phone'),
  validator = require('validator'), // Used for validating email addresses and urls
  cfg = require('../config');

var word_Regex = /\s+/gi;

var mongodb = require("mongodb");
var objectid = mongodb.ObjectID;
var validator = require("validator");

var reProblemName = /^([a-zA-Z0-9'",._\-?!:;@ ]){1,50}$/;
var reSummary = /^([a-zA-Z0-9'",._\-?!:;@\/\\ \s\r\n]){0,1000}$/;
var reRequirements = /^([a-zA-Z0-9'",._\-?!:;@\/\\ \s\r\n]){0,5000}$/;
var rePocName = /^([a-zA-Z0-9',.\- ]){0,100}$/;
const MAX_PROBLEM_DESCRIPTION_LENGTH = 10000;
const MAX_PROBLEM_CATEGORIES = 10;
const MAX_LENGTH_CATEGORY = 30;
const reProblemCategories = /^([a-zA-Z0-9',.\- ]){0,300}$/;

function validateProblemSubmissionFields(req) {
  var errorObj = {};
  req.user = req.user || {};
  req.body = req.body || {};
  if (req.user.orgRef && !objectid.isValid(req.user.orgRef)) {
    errorObj.orgRef = "The organization submitting this Problem does not have a valid ID.";
  }

  if (!req.body.name) {
    errorObj.name = "A Problem name is required.";
  }
  else if (!reProblemName.test(req.body.name)) {
    errorObj.name = "The Problem Title contains a non-permitted character or is too long.";
  }

  if (!req.body.startDate) {
    errorObj.startDate = "A start date is required.";
  }
  else {
    var timestampStartDate = Date.parse(req.body.startDate);
    if (isNaN(timestampStartDate)) {
      errorObj.startDate = "An invalid start date was entered.";
    }
  }

  if (!req.body.endDate) {
    errorObj.endDate = "An end date is required.";
  }
  else {
    var timestampEndDate = Date.parse(req.body.endDate);
    if (isNaN(timestampEndDate)) {
      errorObj.endDate = "An invalid end date was entered.";
    }
  }

  if (req.body.summary && !reSummary.test(req.body.summary)) {
    errorObj.summary = "The summary field contains a non-permitted character or is too long.";
  }

  if (!req.body.description) {
    errorObj.description = "A Problem description is required.";
  }
  else if (req.body.description.length > MAX_PROBLEM_DESCRIPTION_LENGTH) {
    errorObj.description = "The description field contain must contain less than " + MAX_PROBLEM_DESCRIPTION_LENGTH  + " characters.";
  }

  if (req.body.requirements && !reRequirements.test(req.body.requirements)) {
    errorObj.requirements = "The help requirements field contains a non-permitted character or is too long.";
  }

  if (req.body.pocName && !rePocName.test(req.body.pocName)) {
    errorObj.pocName = "The POC name contains a non-permitted character or is too long.";
  }

  if (req.body.pocEmail && !validator.isEmail(req.body.pocEmail)) {
    errorObj.pocEmail = "The POC email is invalid";
  }

  if (req.body.category && !reProblemCategories.test(req.body.category)) {
    errorObj.category = "One of the categories contains a non-permitted category or there are too many characters submitted.";
  }
  else if (req.body.category) {
    var categories = req.body.category.split(',');
    if (categories.length > MAX_PROBLEM_CATEGORIES) {
      errorObj.category = "Too many categories were provided.";
    }
    else {
      for (var i = 0; i < categories.length; i++) {
        if (categories[i].length > MAX_LENGTH_CATEGORY) {
          errorObj.category = "The category " + categories[i] + " contains too many characters.";
          break;
        }
      }
    }
  }

  return errorObj;
}

module.exports = {
  isValidEmailAddress: function (email) {
    return validator.isEmail(email);
  },
  isValidPhoneNumber: function (phoneNumber) {
    return phone_validator(phoneNumber);
  },
  isValidWebLink: function (webLink) {
    return validator.isURL(webLink);
  },
  isNumber: function (numberStr) {
    return !isNaN(numberStr) && isFinite(numberStr);
  },
  isToManyWords: function (text, maxCount) {
    if (!text) {
      return false;
    }
    var wordCount = text.trim().replace(word_Regex, ' ').split(' ').length;
    return wordCount > maxCount;
  },
  isValidUploadFileType: function (mimeType) {
    return cfg.validUploadMimeTypes.indexOf(mimeType) > -1;
  },
  validateProblemSubmissionFields : validateProblemSubmissionFields
};



