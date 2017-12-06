var moment = require('moment-timezone'),
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
  long: "MMMM DD, YYYY hh:mm a",
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

hbsHelpers.ifIn = function (elem, list, options) {
  if (list && elem && list.indexOf(elem) > -1) {
    return options.fn(this);
  }
  return options.inverse(this);
};

hbsHelpers.ifDev = function (options) {
  if (process.env.NODE_ENV == 'development') {
    return options.fn(this);
  }
  else {
    return options.inverse(this);
  }
};

hbsHelpers.orCond = function (v1, v2, options) {
  if (v2 || v1) {
    return options.fn(this);
  }
  else {
    return options.inverse(this);
  }
};

hbsHelpers.getDebug = function (optionalValue) {
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

};

hbsHelpers.getOrgLogoURL = function (orgValue, orgs) {
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
};

hbsHelpers.getOrgName = function (orgRef, orgs) {
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
};

hbsHelpers.hasPastDate = function (date, options) {
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
};

hbsHelpers.onOrPastDate = function (date, options) {
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
};

hbsHelpers.youngerThanOneWeek = function(date, options) {
  var momentDate = moment(date);
  if (date) {
    if (momentDate.isAfter(moment().subtract(7, 'days').startOf('day'))) {
      return options.fn(this);
    }
    else {
      return options.inverse(this);
    }
  }
  else {
    return options.inverse(this);
  }

}

hbsHelpers.getChallengeRegistrationOrgName = function (challengeID, challenges, orgs) {
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
};

hbsHelpers.getChallengeRegistrationComName = function (challengeID, communities) {
    if (!challengeID || !communities) {
        return '';
    }
    var comName = '';
    if (!challengeID instanceof mongoose.Types.ObjectId) {
        challengeID = new ObjectID(challengeID);
    }
    communities.forEach(function (community) {
        for (i = 0; i < community.discoveries.length; i++) {
            if (community.discoveries[i] == challengeID) {
                comName = community.name;
            }
        }
    });
    if (comName !== null && typeof comName !== 'undefined') {
        
        return comName;
    } else {
        return '';
    }
};

hbsHelpers.getChallengeRegistrationComLogo = function (challengeID, communities) {
    if (!challengeID || !communities) {
        return '';
    }
    var comName = '';
    if (!challengeID instanceof mongoose.Types.ObjectId) {
        challengeID = new ObjectID(challengeID);
    }
    communities.forEach(function (community) {
        for (i = 0; i < community.discoveries.length; i++) {
            if (community.discoveries[i] == challengeID) {
                comName = community.logoUrl;
            }
        }
    });
    if (comName !== null && typeof comName !== 'undefined') {

        return comName;
    } else {
        return '';
    }
};

hbsHelpers.getProductName = function (capabilityId, capabilities) {
  if (!capabilityId || !capabilities) {
    return '';
  }
  var capabilityName = '';
  if (!capabilityId instanceof mongoose.Types.ObjectId) {
    capabilityId = new ObjectID(capabilityId);
  }
  if (capabilities.forEach) {
    capabilities.forEach(function (cap) {
      if (cap._id.equals(capabilityId)) {
        capabilityName = cap.name;
      }
    });
  }
  return capabilityName;
};

hbsHelpers.block = function (name) {
  if (!name) {
    return null;
  }
  var blocks = this._blocks;
  var content = blocks && blocks[name];
  return content ? content.join('\n') : null;
};

hbsHelpers.contentFor = function (name, options) {
  var blocks = this._blocks || (this._blocks = {});
  var block = blocks[name] || (blocks[name] = []);
  block.push(options.fn(this));
};

hbsHelpers.dateFormatter = function (datetime, format, tz) {
  if (!datetime) {
    return '';
  }
  format = _dateFormats[format] || format;
  if(typeof(tz) === "string" ){
    return moment(datetime).tz(tz).format(format);
  }
  else{
    return moment(datetime).format(format);
  }
};

hbsHelpers.prettyPrintJSON = function(data){
  var jsonStr =  JSON.stringify(data, null, 2)
    .replace(/\\n/g, " <br /> ")
    .replace(/"/g, "");
  return jsonStr.trim().substring(1, jsonStr.length -1);
};

hbsHelpers.convertToEST = function (datetime, format) {
  if (!datetime) {
    return '';
  }
  format = _dateFormats[format] || format;
  return moment(datetime).format(format);
};

hbsHelpers.lengthOf = function (arr) {
  if (arr && arr.length) {
    return arr.length;
  }
  return 0;
};

hbsHelpers.unlessAnd = function (v1, v2, options) {
  if (!v1 && !v2) {
    return options.fn(this)
  }
  return options.inverse(this);
};

hbsHelpers.greaterThan = function (v1, v2, options) {
  if (v1 > v2) {
    return options.fn(this);
  }
  return options.inverse(this);
};

hbsHelpers.greaterThanOrEqualTo = function (v1, v2, options) {
  if (Number(v1) >= Number(v2)) {
    return options.fn(this);
  }
  return options.inverse(this);
};

hbsHelpers.equalsTo = function (v1, v2, options) {
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
};
hbsHelpers.idEqualsTo = function (v1, v2, options) {
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
};

hbsHelpers.notEqualsTo = function (v1, v2, options) {
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
};

hbsHelpers.isClient = function (v1, options) {
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
};

hbsHelpers.isClientOwner = function (v1, v2, v3, options) {
  if (!v1) {
    return options.inverse(this);
  }
  var valueToLower = v1.toLowerCase();
  if (typeof(v2) === 'object') {
    v2 = JSON.stringify(v2);
  }
  if (typeof(v3) === 'object') {
    v3 = JSON.stringify(v3);
  }
  if (valueToLower === 'client' || valueToLower == 'both') {
    return options.fn(this);
  } else if (v2 === v3) {
    return options.fn(this); 
  } else {
    return options.inverse(this);
  }
};

hbsHelpers.isProvider = function (v1, options) {
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
};

hbsHelpers.notProvider = function (v1, options) {
    if (!v1) {
        return options.inverse(this);
    }
    var valueToLower = v1.toLowerCase();
    if (valueToLower === 'provider' || valueToLower == 'both') {        
        return options.inverse(this);
    }
    else {
        return options.fn(this);
    }
};

hbsHelpers.isCommunityOwner = function (v1, options) {
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
};

hbsHelpers.isOrgAdmin = function (v1, options) {
  if (!v1) {
    return options.inverse(this);
  }

  if (v1 === true) {
    return options.fn(this);
  }
  else {
    return options.inverse(this);
  }
};

hbsHelpers.userDisplayName = function (userInfo) {
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
};

hbsHelpers.trim = function (str) {
  if (!str) {
    return '';
  }
  return str.trim();
};

hbsHelpers.addDays = function (date, days, format) {
  format = _dateFormats[format] || format;
  return moment(date).add(days, 'days').format(format);
};

hbsHelpers.getFriendlyStage = function (stage) {
  return _stageValues[stage];
};

hbsHelpers.getChallengeStage = function (challengeID, challenges) {
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
};

hbsHelpers.getOrganizationTypeFriendly = function (orgType) {
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
};

hbsHelpers.getOrganizationRoleFriendly = function (orgRole) {
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
};

hbsHelpers.getFriendlyUserRoles = function (userRole) {
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
};

hbsHelpers.getOrgUserRoles = function (userRole, id) {
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
    var userHTML = "";
    for (i = 0; i < userFriendlyRoles.length; i++){
        userHTML = userHTML + "<span class='label label-default label_" + id + "'>" + userFriendlyRoles[i] + "</span> ";
    }
    return userHTML;
};

hbsHelpers.capitalize = function (string) {

  return string ? string.substr(0, 1).toUpperCase() + string.substr(1) : '';
};

hbsHelpers.inLastTwoWeeks = function (date, options) {
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
};

hbsHelpers.toJSONString = function (jsonData) {
  return JSON.stringify(jsonData);
};

hbsHelpers.replaceSpacesWith = function (str, replaceChar, lowerCase) {
  var newStr = str.replace(/\s+/g, replaceChar || '-');
  newStr = newStr.replace(/'/g, "").replace(/&/g, "").replace(/</g, "").replace(/>/g, "").replace(/"/g, "");
  return lowerCase ? newStr.toLowerCase() : newStr;
};

// Array Helpers
//=======================================================
hbsHelpers.isIdInArray = function (id, arrayOfIds, options) {
  if (typeof(id) === 'object') {
    id = JSON.stringify(id);
  }
  if (!arrayOfIds  || arrayOfIds.length === 0) {
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
};

hbsHelpers.checkArray = function (id, arrayOfIds, options) {

  if (arrayOfIds.length === 0) {
    return options.inverse(this);
  }
  for (var j = 0; j < arrayOfIds.length; j++) {
    if (arrayOfIds[j].match(id)) return options.fn(this);
  }
  return options.inverse(this);
};

hbsHelpers.inArray = function (value, array, options) {
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
};

hbsHelpers.ifIdIn = function (id, list, options) {
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
};

hbsHelpers.isMember = function (memberId, CommunityList) {
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
};

hbsHelpers.isCategoryInString = function (category, stringOfCategories, options) {
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
};

hbsHelpers.toJSONString = function (jsonObj) {
  if (!jsonObj) {
    return '';
  }
  else {
    return JSON.stringify(jsonObj);
  }
};

hbsHelpers.getCustomFieldText = function (fieldID, Fields) {
  if (!fieldID || !Fields || !Fields instanceof Array || Fields.length <= 0) {
    return '';
  }
  for (var idx in Fields) {
    if (Fields[idx]._id.toString() === fieldID.toString()) {
      return Fields[idx].label;
    }
  }
};

hbsHelpers.getResponseForCustomField = function (fieldID, responses) {
  if (!fieldID || !responses || !responses instanceof Array || responses.length <= 0) {
    return '';
  }
  for (var idx in responses) {

    if (!isNaN(idx) && responses[idx].fieldId.toString() === fieldID.toString()) {
      if (responses[idx].fieldType === "date") {
        return hbsHelpers.dateFormatter(responses[idx].response, 'short');
      }
      else {
        return responses[idx].response;
      }
    }
  }
  return '';
};

hbsHelpers.isAFeedbackInDraft = function (feedback, options) {
  for (var idx in feedback) {
    if (feedback[idx].isDraft) {
      return options.fn(this);
    }
  }
  return options.inverse(this);
};

hbsHelpers.isAnyFeedbackComplete = function (feedback, options) {
  if (feedback.length > 0) {
    for (var idx in feedback) {
      if (feedback[idx].isDraft === false) {
        return options.fn(this);
      }
    }
  }
  return options.inverse(this);
};

hbsHelpers.getFeedbackResponse = function (feedbackRefInDiscovery, registration) {
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
};

hbsHelpers.getSortedDiscoveryScheduleHtml = function (dates, regEndDate) {
  if (!dates) {
    return '';
  }
  var regEndDateArray = {};
  regEndDateArray = {startDate:regEndDate,endDate:regEndDate,description:'Registration Deadline'};
  if (regEndDate){
    dates.push(regEndDateArray);
  }
	var startDate = null;
    var endDate = null;
  for (var i = 0; i < dates.length; i++) {

      if (dates[i].startDate == null) {
        dates[i].startDate = dates[i].endDate;
		dates[i].endDate = null;
      }
	  if(dates[i].startDate != null){
		  startDate = dates[i].startDate.getTime();
	  }
	  if(dates[i].endDate != null){
		  endDate = dates[i].endDate.getTime();
	  }
	  if (startDate == endDate) {
		dates[i].endDate = null;
      }
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
    if (endIdx <= 0) {
      loop = false;
    }
  }
  var hours = regEndDate.getHours();
  var mid='AM';
  if (hours > 12) {
    hours -= 12;
    mid = 'PM';
  } else if (hours === 0) {
    hours = 12;
  }


  this.datesTable = '';
  dates.forEach(function (element, index, array) {
    var months = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.',
      'Nov.', 'Dec.'];
    this.datesTable += '<tr><td>' + element.description + '</td>';
    if (element.startDate) {
      if(element.description == 'Registration Deadline'){
        this.datesTable += '<td width=110>' + months[(regEndDate.getMonth())] + ' ' + regEndDate.getDate() + ', ' +
          regEndDate.getFullYear() + ' ' + hours + ':' + (regEndDate.getMinutes()<10?'0':'') + regEndDate.getMinutes() + ' ' + mid + '</td>';
      }else{
        this.datesTable += '<td width=110>' + months[(element.startDate.getMonth())] + ' ' + element.startDate.getDate() + ', ' +
          element.startDate.getFullYear() + '</td>';
      }
    } else {
      this.datesTable += '<td width=110></td>';
    }
    if (element.endDate) {
      if(element.description == 'Registration Deadline'){
        this.datesTable += '<td width=140>&mdash;&nbsp;&nbsp;&nbsp;&nbsp;' + months[(regEndDate.getMonth())] + ' ' + regEndDate.getDate() + ', ' +
          regEndDate.getFullYear() + ' ' + hours + ':' + (regEndDate.getMinutes()<10?'0':'') + regEndDate.getMinutes() + ' ' + mid + '</td>';
      }else{
        this.datesTable += '<td width=140>&mdash;&nbsp;&nbsp;&nbsp;&nbsp;' + months[(element.endDate.getMonth())] + ' ' + element.endDate.getDate() + ', ' +
          element.endDate.getFullYear() + '</td>';
      }
    } else {
      this.datesTable += '<td width=140></td>';
    }
    this.datesTable += '</tr>';
  }, this);

  return this.datesTable;
};

hbsHelpers.getRegEndHtml = function (date) {
  if (!date) {
    return '';
  }
  var hours = date.getHours();
  var mid='AM';
  if (hours > 12) {
    hours -= 12;
    mid = 'PM';
  } else if (hours === 0) {
    hours = 12;
  }
  datesTable = '';
  var months = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.',
    'Nov.', 'Dec.'];
  datesTable += '<tr><td>Registration Deadline</td><td></td>';
  datesTable += '<td>' + months[(date.getMonth())] + ' ' + date.getDate() + ', ' +
    date.getFullYear() + ' ' + hours + ':' + (date.getMinutes()<10?'0':'') + date.getMinutes() + ' ' + mid + '</td>';
  datesTable += '</tr>';

  return datesTable;
};

hbsHelpers.checkDateTime = function (date, options) {
  if (!date) {
    return options.inverse(this);
  }
  if (date < new Date().getTime()) {
    return options.fn(this);
  }
  else {
    return options.inverse(this);
  }
};

hbsHelpers.onlyTakeNCharacters = function (phrase, charCnt) {
  if (!phrase || !charCnt || isNaN(charCnt)) {
    return phrase || "";
  }
  else {
    return sanitizeHtml(phrase.length > charCnt ? phrase.substr(0, charCnt) + '...' : phrase);

  }
};

hbsHelpers.removeExtensionFromName = function (filename) {
  if (!filename) {
    return '';
  }
  return filename.split('.')[0];
};

hbsHelpers.getAccountNameById = function (idToSearch, accounts) {
  if (idToSearch && accounts) {
    if (!idToSearch instanceof mongoose.Types.ObjectId) {
      idToSearch = new ObjectID(idToSearch);
    }
    var accountName = '';
    accounts.forEach( function(accountObj) {
      if (!accountObj._id instanceof mongoose.Types.ObjectId) {
        accountObj._id = new ObjectID(accountObj._id);
      }
      if (idToSearch.toString() === accountObj._id.toString()) {
        accountName = accountObj.firstName + ' ' + accountObj.lastName;
      }
    });
    return accountName;
  }
  else {
    return '';
  }
};

hbsHelpers.isPermittedForInternalAssessment = function (discoveryManagerIds, discoveryEvaluatorIds, userId, options) {
  if (isUserPermittedToEvaluateRegistration(discoveryManagerIds, discoveryEvaluatorIds, userId)) {
    return options.fn(this);
  }
  return options.inverse(this);
};

function isUserPermittedToEvaluateRegistration (discoveryManagerIds, discoveryEvaluatorIds, userId) {
  if (typeof(userId) === 'object') {
    userId = JSON.stringify(userId);
  }

  // See if the user is a discovery manager
  for (var idx in discoveryManagerIds) {
    if (typeof(discoveryManagerIds[idx]) === 'object') {
      discoveryManagerIds[idx] = JSON.stringify(discoveryManagerIds[idx]);
    }
    if (discoveryManagerIds[idx] === userId) {
      return true;
    }
  }

  // See if the user is a discovery evaluator
  for (var idx in discoveryEvaluatorIds) {
    if (typeof(discoveryEvaluatorIds[idx]) === 'object') {
      discoveryEvaluatorIds[idx] = JSON.stringify(discoveryEvaluatorIds[idx]);
    }
    if (discoveryEvaluatorIds[idx] === userId) {
      return true;
    }
  }
  return false;
};

hbsHelpers.doesExistOtherEvaluators = function (discoveryManagerIds, discoveryEvaluatorIds, options) {
  if (discoveryManagerIds.length > 1 || discoveryEvaluatorIds.length > 0) {
    return options.fn(this);
  }
  return options.inverse(this);
};

hbsHelpers.getNumberOfEvaluators = function (discoveryManagerIds, discoveryEvaluatorIds, userId) {
  var numEvaluators = discoveryManagerIds.length + discoveryEvaluatorIds.length;
  return numEvaluators;
};

hbsHelpers.getNumberOfSubmittedInternalAssessments = function (internalAssessments) {
  return internalAssessments.length;
};

hbsHelpers.hasStartedInternalAssessment = function (userId, internalAssessments, options) {
  if (typeof(userId) === 'object') {
    userId = JSON.stringify(userId);
  }
  for (var idx in internalAssessments) {
    if (userId === internalAssessments[idx].userId) {
      if (typeof(internalAssessments[idx].userId) === 'object') {
        internalAssessments[idx].userId = JSON.stringify(internalAssessments[idx].userId);
      }
      if (internalAssessments[idx].rating || internalAssessments[idx].overview || internalAssessments[idx].attachments) {
        return options.fn(this);
      }
      else {
        return options.inverse(this);
      }
    }
  }
  return options.inverse(this);
};

hbsHelpers.getInternalAssessmentScore = function (userId, internalAssessments) {
  if (typeof(userId) === 'object') {
    userId = JSON.stringify(userId);
  }
  for (var idx in internalAssessments) {
    if (userId === internalAssessments[idx].userId) {
      if (internalAssessments[idx].rating) {
        return internalAssessments[idx].rating.toString();
      }
      else if (typeof(internalAssessments[idx].rating) === 'undefined') {
        return 'Undefined';
      }
      else {
        return 'Not Scored Yet';
      }
    }
  }
  return '';
};

hbsHelpers.getInternalAssessmentId = function (userId, internalAssessments) {
  if (typeof(userId) === 'object') {
    userId = JSON.stringify(userId);
  }
  for (var idx in internalAssessments) {
    if (userId === internalAssessments[idx].userId) {
      return internalAssessments[idx].id;
    }
  }
  return '';
};

hbsHelpers.doesExist = function (val, options) {
  if (typeof val === 'undefined') {
    return options.inverse(this);
  }
  else if (val === null) {
    return options.inverse(this);
  }
  else {
    return options.fn(this);
  }
};

hbsHelpers.isPermittedForProviderFeedback = function (discoveryManagerIds, userId, options) {
  if (isUserPermittedForProviderFeedback(discoveryManagerIds, userId)) {
    return options.fn(this);
  }
  return options.inverse(this);
};

function isUserPermittedForProviderFeedback (discoveryManagerIds, userId) {
  if (typeof(userId) === 'object') {
    userId = JSON.stringify(userId);
  }
  // See if the user is a discovery manager
  for (var idx in discoveryManagerIds) {
    if (typeof(discoveryManagerIds[idx]) === 'object') {
      discoveryManagerIds[idx] = JSON.stringify(discoveryManagerIds[idx]);
    }
    if (discoveryManagerIds[idx] === userId) {
      return true;
    }
  }
  return false;
};

hbsHelpers.isAtLeastOneInternalAssessmentSubmitted = function (internalAssessments, options) {
  var isAtLeastOneInternalAssessmentSubmitted = false;
  internalAssessments.forEach( function(element, index, array) {
    if (element.rating || element.overview || element.attachments) {
      isAtLeastOneInternalAssessmentSubmitted = true;
    }
  });
  if (isAtLeastOneInternalAssessmentSubmitted) {
    return options.fn(this);
  }
  else {
    return options.inverse(this);
  }
};

hbsHelpers.getOrganizationRoleForDiscovery = function (organizationId, organizations) {
  for (var idx in organizations) {
    if (organizations[idx].id.toString() === organizationId.toString()) {
      return organizations[idx].orgRole;
    }
  }
  return '';
};

hbsHelpers.getCommunityOwnerName = function (community, organizations) {
  for (var idx in organizations) {
    if ( organizations[idx]._id.toString() === community.owner.toString() ) {
      return organizations[idx].orgName;
    }
  }
  return 'Organization no longer a member of GSM';
};

hbsHelpers.getCommunityOwnerUrlFriendlyName = function (community, organizations) {
  for (var idx in organizations) {
    if ( organizations[idx]._id.toString() === community.owner.toString() ) {
      return organizations[idx].urlFriendlyID;
    }
  }
  return '';
};

hbsHelpers.isOrganizationInCommunity = function (orgId, community, options) {
  for (var idx in community.members) {
    if (community.members[idx].toString() === orgId.toString() ) {
      return options.fn(this);
    }
  }
  return options.inverse(this);
};

hbsHelpers.isDateAndTimeReached = function (dateAndTime, options) {
  var serverDateAndTime = new Date();
  if (serverDateAndTime > dateAndTime) {
    return options.fn(this);
  }
  return options.inverse(this);
};

hbsHelpers.isDateNew = function (dateAndTime, daysConsideredNew, options) {
  var serverDateAndTime = new Date();
  serverDateAndTime.setDate(serverDateAndTime.getDate()-daysConsideredNew);
  if (serverDateAndTime < dateAndTime) {
    return options.fn(this);
  }
  return options.inverse(this);
};

hbsHelpers.isProblemInMyCommunities = function (problemId, myCommunities, options) {
  for (var idxMyCommunities in myCommunities) {
    for (var idxDiscoveries in myCommunities[idxMyCommunities].discoveries) {
      if (myCommunities[idxMyCommunities].discoveries[idxDiscoveries]) {
        if (myCommunities[idxMyCommunities].discoveries[idxDiscoveries].toString() === problemId.toString() ) {
         return options.fn(this);
        }
      }
    }
  }
  return options.inverse(this);
};

hbsHelpers.getCommunityNameProblemIsPosted = function (problemId, communities) {
  for (var idxCommunities in communities) {
    for (var idxDiscoveries in communities[idxCommunities].discoveries) {
      if (communities[idxCommunities].discoveries[idxDiscoveries]) {
        if (communities[idxCommunities].discoveries[idxDiscoveries].toString() === problemId.toString() ) {
          return communities[idxCommunities].name;
        }
      }
    }
  }
  return 'None';
};

hbsHelpers.getCommunityUrlFriendlyIdProblemIsPosted = function (problemId, communities) {
  for (var idxCommunities in communities) {
    for (var idxDiscoveries in communities[idxCommunities].discoveries) {
      if (communities[idxCommunities].discoveries[idxDiscoveries]) {
        if (communities[idxCommunities].discoveries[idxDiscoveries].toString() === problemId.toString() ) {
          return communities[idxCommunities].urlFriendlyID;
        }
      }
    }
  }
  return '';
};
module.exports = hbsHelpers;
