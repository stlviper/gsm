var moment = require('moment'),
  capabilities = require('../models/products').model,
  mongoose = require('mongoose'),
  orgTypes = require('../models/organizations').types,
  orgRoles = require('../models/organizations').roles,
  userRoles = require('../models/accounts').roles,
  sanitizeHtml = require('sanitize-html'),
  Handlebars = require('handlebars'),
  Schema = mongoose.Schema;

var ObjectID = mongoose.Types.ObjectId;
var _dateFormats = {
  short: "MMMM DD, YYYY",
  long: "dddd DD.MM.YYYY HH:mm",
  year: "YYYY"
};
var _stageValues = {
  ScopingPreparation: 'Scoping & Preparation',
  RegistrationandQA: 'Registration and Q&A',
  EligibilityCheck: 'Eligibility Check',
  AssessmentPreparation: 'Assessment Preparation',
  UserAssessment: 'User Assessment',
  Complete: 'Complete'
};
var hbsHelpers = {};

Handlebars.registerHelper('ifIn', function (elem, list, options) {
  if (list && elem && list.indexOf(elem) > -1) {
    return options.fn(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper('ifDev', function (options) {
  if (process.env.NODE_ENV == 'development') {
    return options.fn(this);
  }
  else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('orCond', function (v1, v2, options) {
  if (v2 || v1) {
    return options.fn(this);
  }
  else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('getDebug', function (optionalValue) {
  if (optionalValue) {
    console.log("====================================================================================================");
    console.log("Value");
    console.log("====================================================================================================");
    console.log(optionalValue);
  }
  else {
    console.log("====================================================================================================");
    console.log("Current Context");
    console.log("====================================================================================================");
    console.log(this);
  }

});

Handlebars.registerHelper('getOrgLogoURL', function (orgValue, orgs) {
  var orgURL = '';
  if (orgs && orgValue) {

    if (!orgValue instanceof mongoose.Types.ObjectId) {
      orgValue = new ObjectID(orgValue);
    }
    orgs.forEach(function (org) {
      if (org._id.equals(orgValue)) {
        orgURL = org.logoUrl;
      }
    });
  }
  if (orgURL) {
    return orgURL;
  } else {
    return '/images/logo-default.png';
  }
});

Handlebars.registerHelper('getOrgName', function (orgRef, orgs) {
  if (!orgRef || !orgs) {
    return '';
  }
  var orgName = '';
  if (!orgRef instanceof mongoose.Types.ObjectId) {
    orgRef = new ObjectID(orgRef);
  }
  orgs.forEach(function (org) {
    if (org._id.equals(orgRef)) {
      orgName = org.orgName;
    }
  });
  return orgName;
});

Handlebars.registerHelper('hasPastDate', function (date, options) {
  if (date) {
    if (moment().diff(moment(date)) > 0) {
      return options.fn(this);
    }
    else {
      return options.inverse(this);
    }
  }
  else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('onOrPastDate', function (date, options) {
  if (date) {
    if (moment().diff(moment(date)) >= 0) {
      return options.fn(this);
    }
    else {
      return options.inverse(this);
    }
  }
  else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('getChallengeRegistrationOrgName', function (challengeID, challenges, orgs) {
  if (!challengeID || !challenges || !orgs) {
    return '';
  }
  var orgName = '';
  var orgRef = null;
  if (!challengeID instanceof mongoose.Types.ObjectId) {
    challengeID = new ObjectID(challengeID);
  }
  challenges.forEach(function (challenge) {
    if (challenge._id.equals(challengeID)) {
      orgRef = challenge.orgRef;
    }
  });
  if (orgRef !== null && typeof orgRef !== 'undefined') {
    orgs.forEach(function (org) {
      if (org._id.equals(orgRef)) {
        orgName = org.orgName;
      }
    });
    return orgName;
  } else {
    return '';
  }
});

Handlebars.registerHelper('getProductName', function (capabilityId, capabilities) {
  if (!capabilityId || !capabilities) {
    return '';
  }
  var capabilityName = '';
  if (!capabilityId instanceof mongoose.Types.ObjectId) {
    capabilityId = new ObjectID(capabilityId);
  }
  if (capabilities.forEach) {
    capabilities.forEach(function (prod) {
      if (prod._id.equals(capabilityId)) {
        capabilityName = prod.name;
      }
    });
  }
  return capabilityName;
});

Handlebars.registerHelper('block', function (name) {
  if (!name) {
    return null;
  }
  var blocks = this._blocks;
  var content = blocks && blocks[name];
  return content ? content.join('\n') : null;
});

Handlebars.registerHelper('contentFor', function (name, options) {
  var blocks = this._blocks || (this._blocks = {});
  var block = blocks[name] || (blocks[name] = []);
  block.push(options.fn(this));
});

Handlebars.registerHelper('dateFormatter', function (datetime, format) {
	var _dateFormats = {
  short: "MMMM DD, YYYY",
  long: "dddd DD.MM.YYYY HH:mm",
  year: "YYYY"
};
  if (!datetime) {
    return '';
  }
  format = _dateFormats[format] || format;
  return moment(datetime).format(format);
});

Handlebars.registerHelper('lengthOf', function (arr) {
  if (arr && arr.length) {
    return arr.length;
  }
  return 0;
});

Handlebars.registerHelper('unlessAnd', function (v1, v2, options) {
  if (!v1 && !v2) {
    return options.fn(this)
  }
  return options.inverse(this);
});

Handlebars.registerHelper('greaterThan', function (v1, v2, options) {
  if (v1 > v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper('equalsTo', function (v1, v2, options) {
  if (!v1) {
    return options.inverse(this);
  }
  if (typeof(v1) === 'object') {
    v1 = JSON.stringify(v1);
  }
  if (typeof(v2) === 'object') {
    v2 = JSON.stringify(v2);
  }
  if (v1 === v2) {
    return options.fn(this);
  }
  else {
    return options.inverse(this);
  }
});
Handlebars.registerHelper('idEqualsTo', function (v1, v2, options) {
  if (!v1 || !v2) {
    return options.inverse(this);
  } else {
    if (v1.toString() === v2.toString()) {
      return options.fn(this);
    }
    else {
      return options.inverse(this);
    }
  }
});

Handlebars.registerHelper('notEqualsTo', function (v1, v2, options) {
  if (!v1) {
    return options.inverse(this);
  }
  if (typeof(v1) === 'object') {
    v1 = JSON.stringify(v1);
    v2 = JSON.stringify(v2);
  }
  if (v1 !== v2) {
    return options.fn(this);
  }
  else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('isClient', function (v1, options) {
  if (!v1) {
    return options.inverse(this);
  }
  var valueToLower = v1.toLowerCase();
  if (valueToLower === 'client' || valueToLower == 'both') {
    return options.fn(this);
  }
  else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('isProvider', function (v1, options) {
  if (!v1) {
    return options.inverse(this);
  }
  var valueToLower = v1.toLowerCase();
  if (valueToLower === 'provider' || valueToLower == 'both') {
    return options.fn(this);
  }
  else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('isCommunityOwner', function (v1, options) {
  if (!v1) {
    return options.inverse(this);
  }
  var valueToLower = v1.toLowerCase();
  if (valueToLower === 'communityowner') {
    return options.fn(this);
  }
  else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('isOrgAdmin', function (v1, options) {
  if (!v1) {
    return options.inverse(this);
  }

  if (v1 === true) {
    return options.fn(this);
  }
  else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('userDisplayName', function (userInfo) {
  if (!userInfo) {
    return '';
  }
  var displayName = userInfo.username;
  if (userInfo.firstName && userInfo.firstName.length > 0) {
    displayName = userInfo.firstName;
    if (userInfo.lastName && userInfo.lastName.length > 0) {
      displayName += ' ' + userInfo.lastName;
    }
  }
  return displayName;
});

Handlebars.registerHelper('trim', function (str) {
  if (!str) {
    return '';
  }
  return str.trim();
});

Handlebars.registerHelper('addDays', function (date, days, format) {
  format = _dateFormats[format] || format;
  return moment(date).add(days, 'days').format(format);
});

Handlebars.registerHelper('getFriendlyStage', function (stage) {
  return _stageValues[stage];
});

Handlebars.registerHelper('getChallengeStage', function (challengeID, challenges) {
  if (!challenges || !challengeID) {
    return '';
  }
  var stage = '';
  if (!challengeID instanceof mongoose.Types.ObjectId) {
    challengeID = new ObjectID(challengeID);
  }
  challenges.forEach(function (challenge) {
    if (challenge._id.equals(challengeID)) {
      stage = challenge.stage;
    }
  });
  return _stageValues[stage];
});

Handlebars.registerHelper('getOrganizationTypeFriendly', function (orgType) {
  orgType = orgType.toLowerCase();
  if (orgTypes.academia.toLowerCase() == orgType) {
    return 'Academia';
  }
  else if (orgTypes.industry.toLowerCase() == orgType) {
    return 'Industry';
  }
  else if (orgTypes.government.toLowerCase() == orgType) {
    return 'Government';
  }
  return '';
});

Handlebars.registerHelper('getOrganizationRoleFriendly', function (orgRole) {
  if (orgRole) {
    orgRole = orgRole.toLowerCase();
    if (orgRoles.provider.toLowerCase() == orgRole) {
      return 'Provider';
    }
    else if (orgRoles.client.toLowerCase() == orgRole) {
      return 'Explorer';
    }
    else if (orgRoles.both.toLowerCase() == orgRole) {
      return 'Both';
    }
    else if (orgRoles.communityOwner.toLowerCase() == orgRole) {
      return 'Community Owner';
    }
    return '';
  }
  else {
    return '';
  }
});

Handlebars.registerHelper('getFriendlyUserRoles', function (userRole) {
  userFriendlyRoles = [];
  for (var idx in userRole) {
    var role = userRole[idx].toLowerCase();
    if (role === userRoles.Admin.toLowerCase()) {
      userFriendlyRoles.push('Administrator');
    }
    else if (role === userRoles.User.toLowerCase()) {
      userFriendlyRoles.push('User');
    }
    else if (role === userRoles.OrgManager.toLowerCase()) {
      userFriendlyRoles.push('Organization Manager');
    }
  }
  return userFriendlyRoles;
});

Handlebars.registerHelper('capitalize', function (string) {

  return string ? string.substr(0, 1).toUpperCase() + string.substr(1) : '';
});

Handlebars.registerHelper('inLastTwoWeeks', function (date, options) {
  var ms = moment().diff(moment(date));

  if (!date) {
    return options.inverse(this);
  }
  else if (moment.duration(ms).asDays() < 14) {
    return options.fn(this);
  }
  else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('toJSONString', function (jsonData) {
  return JSON.stringify(jsonData);
});

Handlebars.registerHelper('replaceSpacesWith', function (str, replaceChar, lowerCase) {
  var newStr = str.replace(/\s+/g, replaceChar || '-');
  return lowerCase ? newStr.toLowerCase() : newStr;
});

// Array Helpers
//=======================================================
Handlebars.registerHelper('isIdInArray', function (id, arrayOfIds, options) {
  if (typeof(id) === 'object') {
    id = JSON.stringify(id);
  }
  if (arrayOfIds.length === 0) {
    return options.inverse(this);
  }
  for (var idx in arrayOfIds) {
    if (typeof(arrayOfIds[idx]) === 'object') {
      arrayOfIds[idx] = JSON.stringify(arrayOfIds[idx]);
    }
    if (arrayOfIds[idx] === id) {
      return options.fn(this);
    }
  }
  return options.inverse(this);
});

Handlebars.registerHelper('checkArray', function (id, arrayOfIds, options) {

  if (arrayOfIds.length === 0) {
    return options.inverse(this);
  }
  for (var j = 0; j < arrayOfIds.length; j++) {
    if (arrayOfIds[j].match(id)) return options.fn(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper('inArray', function (value, array, options) {
  if (value == null || typeof value === 'undefined' || array == null || typeof array === 'undefined') {
    return options.inverse(this);
  }
  array = array.replace(/ /g, '').split(',');
  if (array.indexOf(value.replace(/ /g, '')) > -1) {
    return options.fn(this);
  }
  else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('ifIdIn', function (id, list, options) {
  if (list && id) {
    var inArray = false;
    list.forEach(function (item) {
      if (item._id.equals(id)) {
        inArray = true;
      }
    });
    return inArray ? options.fn(this) : options.inverse(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper('isMember', function (memberId, CommunityList) {
  if (CommunityList && memberId) {
    var inArray = false;
    CommunityList.forEach(function (item) {
      if (item.members && item.members.indexOf(id) > -1) {
        inArray = true;
      }
    });
    return inArray ? options.fn(this) : options.inverse(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper('isCategoryInString', function (category, stringOfCategories, options) {
  if (typeof(category) === 'object') {
    category = JSON.stringify(category);
  }
  if (typeof(stringOfCategories) === 'undefined') {
    return options.inverse(this);
  }
  if (typeof(stringOfCategories) === 'object') {
    stringOfCategories = JSON.stringify(stringOfCategories);
  }
  if (stringOfCategories.length === 0) {
    return options.inverse(this);
  }
  var splitCategories = stringOfCategories.split(',');

  for (var idx in splitCategories) {
    if (splitCategories[idx] === category) {
      return options.fn(this);
    }
  }
  return options.inverse(this);
});

Handlebars.registerHelper('toJSONString', function (jsonObj) {
  if (!jsonObj) {
    return '';
  }
  else {
    return JSON.stringify(jsonObj);
  }
});

Handlebars.registerHelper('getCustomFieldText', function (fieldID, Fields) {
  if (!fieldID || !Fields || !Fields instanceof Array || Fields.length <= 0) {
    return '';
  }
  for (var idx in Fields) {
    if (Fields[idx]._id.toString() === fieldID.toString()) {
      return Fields[idx].label;
    }
  }
});

Handlebars.registerHelper('getResponseForCustomField', function (fieldID, responses) {
  if (!fieldID || !responses || !responses instanceof Array || responses.length <= 0) {
    return '';
  }
  for (var idx in responses) {

    if (!isNaN(idx) && responses[idx].fieldId.toString() === fieldID.toString()) {
      if (responses[idx].fieldType === "date") {
        return new Handlebars.helpers.dateFormatter(responses[idx].response, 'short');
      }
      else {
        return responses[idx].response;
      }
    }
  }
  return '';
});

Handlebars.registerHelper('isAFeedbackInDraft', function (feedback, options) {
  for (var idx in feedback) {
    if (feedback[idx].isDraft) {
      return options.fn(this);
    }
  }
  return options.inverse(this);
});

Handlebars.registerHelper('isAnyFeedbackComplete', function (feedback, options) {
  if (feedback.length > 0) {
    for (var idx in feedback) {
      if (feedback[idx].isDraft === false) {
        return options.fn(this);
      }
    }
  }
  return options.inverse(this);
});

Handlebars.registerHelper('getFeedbackResponse', function (feedbackRefInDiscovery, registration) {
  if (!feedbackRefInDiscovery || !registration || !registration.feedback) {
    return '';
  }
  for (var idxFeedback in registration.feedback) {
    if (!registration.feedback[idxFeedback].feedbackAreas) {
      continue;
    }
    var feedbackAreas = registration.feedback[idxFeedback].feedbackAreas;
    for (var idxFeedbackAreas = 0; idxFeedbackAreas < feedbackAreas.length; idxFeedbackAreas++) {
      if (registration.feedback[idxFeedback].feedbackAreas[idxFeedbackAreas].feedbackRef.toString() === feedbackRefInDiscovery.toString()) {
        if (registration.feedback[idxFeedback].isDraft) {
          return registration.feedback[idxFeedback].feedbackAreas[idxFeedbackAreas].response;
        }
      }
    }
  }
  return '';
});

Handlebars.registerHelper('getSortedDiscoveryScheduleHtml', function (dates) {
  if (!dates) {
    return '';
  }

  dates = dates.sort(function (a, b) {
    return a.startDate - b.startDate
  });
  // Since these schedules will be small, just do a bubble sort...
  var loop = true;
  var endIdx = dates.length - 1;
  while (loop) {
    for (var i = 0; i < endIdx; i++) {
      if (dates[i].startDate == null) {
        if (dates[i].endDate >= dates[i + 1].endDate) {
          var tmp = dates[i + 1];
          dates[i + 1] = dates[i];
          dates[i] = tmp;
        }
      }
    }
    endIdx -= 1;
    if (endIdx == 0) {
      loop = false;
    }
  }


  this.datesTable = '';
  dates.forEach(function (element, index, array) {
    var months = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.',
      'Nov.', 'Dec.'];
    this.datesTable += '<tr><td>' + element.description + '</td>';
    if (element.startDate) {
      this.datesTable += '<td>' + months[(element.startDate.getMonth())] + ' ' + element.startDate.getDate() + ', ' +
        element.startDate.getFullYear() + '</td>';
    } else {
      this.datesTable += '<td></td>';
    }
    if (element.endDate) {
      this.datesTable += '<td>' + months[(element.endDate.getMonth())] + ' ' + element.endDate.getDate() + ', ' +
        element.endDate.getFullYear() + '</td>';
    } else {
      this.datesTable += '<td></td>';
    }
    this.datesTable += '</tr>';
  }, this);

  return this.datesTable;
});

Handlebars.registerHelper('onlyTakeNCharacters', function (phrase, charCnt) {
  if (!phrase || !charCnt || isNaN(charCnt)) {
    return phrase || "";
  }
  else {
    return sanitizeHtml(phrase.length > charCnt ? phrase.substr(0, charCnt) + '...' : phrase);

  }
});
// this will be called after the file is read
hbsHelpers.renderToString = function (source, data) {
	
  var template = Handlebars.compile(source);
  var outputString = template(data);
  return outputString;
}
module.exports = hbsHelpers;