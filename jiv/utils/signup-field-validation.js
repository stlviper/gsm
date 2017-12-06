var phone_validator = require('phone'); // Used for validating phone numbers
var validator = require('validator'); // Used for validating email addresses and urls
var validUrl = require('valid-url');
var orgTypes = {government: 'government', industry: 'industry', academia: 'academia'};
var phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
var PNF = require('google-libphonenumber').PhoneNumberFormat;

var NUMBER_OF_DUNS_DIGITS = 9;
var NUMBER_OF_NAICS_DIGITS_MIN = 6;
var NUMBER_OF_NAICS_DIGITS_MAX = 6;
var MAX_FIELD_LENGTH = 64;
var WHITELISTED_CHARACTERS_ORGANIZATION_NAME = /[^a-zA-Z0-9 \(\)\-\.,']*/;
var WHITELISTED_CHARACTERS_ORGANIZATION_ADDR = /[^a-zA-Z0-9 \(\)\.,'#\-\n\r]*/;
var WHITELISTED_CHARACTERS_ORGANIZATION_ROLE = /[^a-zA-Z \(\)\-\/]*/;
var WHITELISTED_CHARACTERS_CONTACT_NAMES = /[^a-zA-Z \(\)\-\.,']*/;
var WHITELISTED_CHARACTERS_EMAIL_ADDR = /[^a-zA-Z0-9 \-@\._&'+=]*/;

module.exports = {

  isValidOrganizationName: function (name) {
    if (this.isFieldEmpty(name)) {
      return "An organization name is required.";
    }
    else if (!isValidStringLength(name)) {
      return "Organization name length must be less than " + MAX_FIELD_LENGTH + " characters.";
    }
    else if (!isOnlyWhitelistedCharactersPresent(name, WHITELISTED_CHARACTERS_ORGANIZATION_NAME)) {
      return "Organization name contains non-permitted characters.";
    }
    return true;
  },

  isValidOrganizationAddress: function (addr) {
    if (this.isFieldEmpty(addr)) {
      return "An organization address is required.";
    }
    else if (!isValidStringLength(addr)) {
      return "Organization address length must be less than " + MAX_FIELD_LENGTH + " characters.";
    }
    else if (!isOnlyWhitelistedCharactersPresent(addr, WHITELISTED_CHARACTERS_ORGANIZATION_ADDR)) {
      return "Organization address contains non-permitted characters.";
    }
    return true;
  },

  isValidOrganizationWebsite: function (url) {
    if (this.isFieldEmpty(url)) {
      return "An organization website is required.";
    }
    else if (!isValidStringLength(url)) {
      return "Organization website must be less that " + MAX_FIELD_LENGTH + " characters.";
    }
    else if (!validator.isURL(url)) {
       return "A valid organization website url is required. Include a http:// or https:// prefix.";
    }
    else if (!validUrl.isWebUri(url)) {
      return "A valid organization website url is required. Include a http:// or https:// prefix.";
    }
    return true;
  },

  isValidOrganizationRole: function (role) {
    if (this.isFieldEmpty(role)) {
      return "An organization role is required.";
    }
    else if (!isValidStringLength(role)) {
      return "The organization role cannot contain more than " + MAX_FIELD_LENGTH + " characters.";
    }
    else if (!isOnlyWhitelistedCharactersPresent(role, WHITELISTED_CHARACTERS_ORGANIZATION_ROLE)) {
      return "The organization role contains non-permitted characters.";
    }
    return true;
  },

  isValidPersonName: function (name, description) {
    if (this.isFieldEmpty(name)) {
      return "A " + description + " is required.";
    }
    else if (!isValidStringLength(name)) {
      return "Names cannot contain more than " + MAX_FIELD_LENGTH + " characters.";
    }
    else if (!isOnlyWhitelistedCharactersPresent(name, WHITELISTED_CHARACTERS_CONTACT_NAMES)) {
      return "The name " + name + " contains non-permitted characters in the " + description + " field.";
    }
    return true;
  },

  isValidEmailAddress: function (email, description) {
    if (this.isFieldEmpty(email)) {
      return "A " + description + " is required.";
    }
    else if (!isOnlyWhitelistedCharactersPresent(email, WHITELISTED_CHARACTERS_EMAIL_ADDR)) {
      return "The " + description + " contains non-permitted characters.";
    }
    else if (!isValidStringLength(email)) {
      return "The " + description + " must be less than " + MAX_FIELD_LENGTH + " characters.";
    }
    else if (!validator.isEmail(email)) {
      return "A valid " + description + " is required.";
    }
    return true;
  },

  isValidGovEmailAddress: function (email, isRequired) {
    if (this.isFieldEmpty(email) && isRequired) {
      return "A .gov or .mil email address is required.";
    }
    var statusMessage = this.isValidEmailAddress(email, "government email address");
    if (statusMessage !== true) {
      return statusMessage;
    }
    if (!(/(.gov|.mil)$/).test(email)) {
      return "A .gov or .mil email address must be used.";
    }
    return true;
  },

  isValidPhoneNumber: function (phone, description) {
    if (this.isFieldEmpty(phone)) {
      return "A " + description + " is required.";
    }
    else if (!isValidStringLength(phone)) {
      return "The " + description + " must be less than " + MAX_FIELD_LENGTH + " characters.";
    }
    else if (!isValidPhoneNumberAndExtension(phone)) {
      return "A valid " + description + " is required. Please include your country code, e.g. +1 for US numbers.";
    }
    return true;
  },

  formatValidPhoneNumber: function (phone) {
    if (!this.isFieldEmpty(phone)) {
      return formatPhoneNumberAndExtension(phone);
    }
    return '';
  },

  // The D-U-N-S Number is a unique nine-digit number that identifies business entities on a location-specific basis.
  // The D-U-N-S Number is widely used as a standard business identifier.
  isValidDunsNumber: function (duns_number) {
    if (this.isFieldEmpty(duns_number)) {
      return "A DUNS number is required for industrial and academic institutions.";
    }
    else if (isNonNumericCharacterPresent(duns_number)) {
      return "A DUNS number may only contain digits.";
    }
    else if (duns_number.length !== NUMBER_OF_DUNS_DIGITS) {
      return "A valid DUNS number is 9 digits.";
    }
    return true;
  },

  // NAICS is a 2- through 6-digit hierarchical classification system, offering five levels of detail. Each digit in
  // the code is part of a series of progressively narrower categories, and the more digits in the code signify
  // greater classification detail. The first two digits designate the economic sector, the third digit designates
  // the subsector, the fourth digit designates the industry group, the fifth digit designates the NAICS industry,
  // and the sixth digit designates the national industry. The 5-digit NAICS code is the level at which there is
  // comparability in code and definitions for most of the NAICS sectors across the three countries participating in
  // NAICS (the United States, Canada, and Mexico). The 6-digit level allows for the United States, Canada, and Mexico
  // each to have country-specific detail. A complete and valid NAICS code contains six digits.
  isValidNaicsCode: function (naics_code) {
    if (!this.isFieldEmpty(naics_code)) {
      if (isNonNumericCharacterPresent(naics_code)) {
        return "A valid NAICS code must only contain digits.";
      }
      else if (naics_code.length < NUMBER_OF_NAICS_DIGITS_MIN ||
        naics_code.length > NUMBER_OF_NAICS_DIGITS_MAX) {
        return "A valid NAICS code must be entered.";
      }
    }
    return true;
  },

  isValidTagLine: function () {
    //TODO
  },

  isValidLocation: function () {
    //TODO
  },

  isValidMarketArea: function () {
    //TODO
  },

  isValidYear: function (year) {
    if (year.length !== 4) {
      return 'The format of the year field is 4 digits.';
    }
    var re = /^[0-9]{4}$/;
    if (!re.test(year)) {
      return 'Invalid year field.';
    }
    return true;
  },

  isValidSize: function () {
    //TODO
  },

  isValidDescription: function () {
    //TODO
  },

  validateOrganizationDataFields: function (organization) {
    var status_message = null;
    if (organization.orgType.toLowerCase() === orgTypes.government) {
      // If an identifier is added, add a check here
    } else if (organization.orgId.name == "orgDuns" && organization.orgId.value && (organization.orgType.toLowerCase() === orgTypes.industry ||
      organization.orgType.toLowerCase() === orgTypes.academia)) {
      // Validate DUNS number
      status_message = this.isValidDunsNumber(organization.orgId.value);
      if (status_message !== true) {
        return status_message;
      }
    }

    // Validate organization name
    status_message = this.isValidOrganizationName(organization.orgName);
    if (status_message !== true) {
      return status_message;
    }

    // Validate organization address
    status_message = this.isValidOrganizationAddress(organization.orgAddress);
    if (status_message !== true) {
      return status_message;
    }

    // Validate organization website
    status_message = this.isValidOrganizationWebsite(organization.orgWebsite);
    if (status_message !== true) {
      return status_message;
    }

    // Validate organization role
    status_message = this.isValidOrganizationRole(organization.orgRole);
    if (status_message !== true) {
      return status_message;
    }

    // Validate business point of contact first name
    status_message = this.isValidPersonName(organization.businessPocFirstName, "business point of contact first name");
    if (status_message !== true) {
      return status_message;
    }

    // Validate business point of contact last name
    status_message = this.isValidPersonName(organization.businessPocLastName, "business point of contact last name");
    if (status_message !== true) {
      return status_message;
    }

    // Validate business point of contact phone number
    status_message = this.isValidPhoneNumber(organization.businessPocPhone, "business point of contact phone number");
    if (status_message !== true) {
      return status_message;
    }
    else {
      organization.businessPocPhone = this.formatValidPhoneNumber(organization.businessPocPhone);
    }

    // Validate business point of contact email
    status_message = this.isValidEmailAddress(organization.businessPocEmail, "business point of contact email address");
    if (status_message !== true) {
      return status_message;
    }

    // Validate technical point of contact first name
    status_message = this.isValidPersonName(organization.technicalPocFirstName, "technical point of contact first name");
    if (status_message !== true) {
      return status_message;
    }

    // Validate technical point of contact last name
    status_message = this.isValidPersonName(organization.technicalPocLastName, "technical point of contact last name");
    if (status_message !== true) {
      return status_message;
    }

    // Validate technical point of contact phone number
    status_message = this.isValidPhoneNumber(organization.technicalPocPhone, "technical point of contact phone number");
    if (status_message !== true) {
      return status_message;
    }
    else {
      organization.technicalPocPhone = this.formatValidPhoneNumber(organization.technicalPocPhone);
    }

    // Validate technical point of contact email
    status_message = this.isValidEmailAddress(organization.technicalPocEmail, "technical point of contact email address");
    if (status_message !== true) {
      return status_message;
    }

    // Validate NAICS Code
    status_message = this.isValidNaicsCode(organization.orgNaics);
    if (status_message !== true) {
      return status_message;
    }

    if (!this.isFieldEmpty(organization.yearFounded)) {
      status_message = this.isValidYear(organization.yearFounded);
      if (status_message !== true) {
        return status_message;
      }
    }

    return true;
  },

  validateUserDataFields: function (user) {
    var status_message = null;
    // Validate user's first name
    status_message = this.isValidPersonName(user.firstName, "user first name");
    if (status_message !== true) {
      return status_message;
    }
    // Validate user's last name
    status_message = this.isValidPersonName(user.lastName, "user last name");
    if (status_message !== true) {
      return status_message;
    }
    // Validate user's email address
    status_message = this.isValidEmailAddress(user.email, "user email address");
    if (status_message !== true) {
      return status_message;
    }
    // Validate user's phone number
    status_message = this.isValidPhoneNumber(user.phoneNumber, "user phone number");
    if (status_message !== true) {
      return status_message;
    }
    else {
      user.phoneNumber = this.formatValidPhoneNumber(user.phoneNumber);
    }
    return true;
  },

  isFieldEmpty: function (string_var) {
    return ( typeof string_var === 'undefined' || string_var === '' || string_var === null);
  }
};

// Local utility functions

function isValidStringLength(string_var) {
  return string_var.length <= MAX_FIELD_LENGTH;
}

function isOnlyWhitelistedCharactersPresent(string_var, re) {
  return re.test(string_var);
}

function isNonNumericCharacterPresent(string_var) {
  var re = /\D/;
  return re.test(string_var);
}

function isNonAlphaNumericCharacterPresent(string_var) {
  var re = /[^a-zA-Z0-9]/;
  return re.test(string_var);
}

function isAlphabeticCharacterPresent(string_var) {
  var re = /[a-zA-Z]/;
  return re.test(string_var);
}

function isNonAlphabeticCharacterPresent(string_var) {
  var re = /^[a-zA-Z]*$/;
  return re.test(string_var);
}

function isValidPhoneNumberAndExtension(phone_number) {
  var sep_nums = separatePhoneNumberAndExtension(phone_number);
  if (!isValidPhoneNumber(sep_nums[0])) {
    return false;
  }
  else if (!isValidPhoneExtension(sep_nums[1])) {
    return false;
  }
  return true;
}

function formatPhoneNumberAndExtension(phone_number) {
  var sep_nums = separatePhoneNumberAndExtension(phone_number);
  var num = formatPhoneNumber(sep_nums[0]);
  var ext = formatPhoneExtension(sep_nums[1]);
  if (ext !== null) {
    return num + ext;
  }
  return num;
}

function separatePhoneNumberAndExtension(phone_number) {
  // If there is an extension, pull it out since the phone
  // library doesn't handle them (it will automatically say the number
  // is invalid)
  var re = /(\s*(x|ext\.?|extension)\s*).*/i;
  extension = phone_number.match(re);
  var ext = '';
  if (extension !== null) {
    phone_number = phone_number.slice(0, extension['index']);
    ext = extension[0];
  }
  return [phone_number, ext];
}

function isValidPhoneNumber(phone_number) {
  if (isAlphabeticCharacterPresent(phone_number)) {
    return false;
  }

  try {
    var tel = phoneUtil.parse(phone_number);
    var formatted_phone_number = phoneUtil.format(tel, PNF.E164);
  }
  catch (e) {
    var formatted_phone_number = [];
  }

  // This filters out non-US numbers too easily...
  //var formatted_phone_number = phone_validator(phone_number);
  return formatted_phone_number.length !== 0;
}

function formatPhoneNumber(phone_number) {
  var tel = phoneUtil.parse(phone_number);
  var checked_phone_number = phoneUtil.format(tel, PNF.E164);

  return checked_phone_number;

  // This filters out non-US numbers too easily...
  // Separate the phone number from the country provided
  // by the phone_validator library
  //var checked_phone_number = phone_validator(phone_number);
  //return checked_phone_number[0];
}

function isValidPhoneExtension(extension) {
  // If there is an extension, it can only have digits
  if (extension !== '') {
    var re = /[^(\s*(x|ext\.?|extension)\s*)]+/;
    var re2 = /^\d+$/;
    var num = extension.match(re);
    return re2.test(num[0]);
  }
  return true;
}

function formatPhoneExtension(extension) {
  re = /\d+/;
  if (re.test(extension)) {
    return 'x' + extension.match(re);
  }
  return null;
}
