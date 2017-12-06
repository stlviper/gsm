var Challenge = require('../models/challenges').model,
  Product = require('../models/products').model,
  Organization = require('../models/organizations').model,
  Registration = require('../models/registrations').Registration,
  mongoose = require('mongoose');

var ObjectId = mongoose.Types.ObjectId;

module.exports = {
  invalidEmails: ['test@test', '@test.com', '@test', 'testtest.com', 'testtestcom'],
  invalidUrls: [
    {description: 'Has spaces', value: 'http://www.example.com/space here.html'},
    {description: 'Has Periods', value: 'http://wwwexamplecom/space herehtml'}
  ],
  invalidOrgNames: [
    {description: '(empty)', value: ''},
    {
      description: 'too many characters',
      name: 'The organization name given in this field is too long and will be rejected abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz'
    },
    {description: 'non-permitted character', value: 'Te$t Organization Name'},
    {description: 'non-permitted character', value: '\"Test Organization Name\"'},
    {description: 'non-permitted character', value: '\'Test Organization Name\''}
  ],
  invalidPhoneNumbers: [
    {description: '(empty)', value: ''},
    {
      description: 'too many characters',
      number: 'The phone number given in this field is too long and will be rejected abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz'
    },
    {description: 'alphabetic character present', value: '314A5555555'},
    {description: 'alphabetic character in extension', value: '3145555555x123A'},
    {description: 'missing number in area code', value: '(31 ) 5555555'},
    {description: 'missing number', value: '(314) 555-555'},
    {description: 'missing number', value: '1314555555'},
    {description: 'invalid area code', value: '(114) 555-5555'},
    {description: 'unsupported country code', value: '+86 (314) 555-5555'}
  ],
  invalidAddresses: [
    {description: '(empty)', value: ''},
    {
      description: 'too many characters',
      value: 'The organization address given in this field is too long and will be rejected abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz'
    },
    {description: 'non-permitted character', value: '#1234 Test Rd St. Louis, MO 63110'}
  ],
  validPhoneNumbers: [
    {description: 'hyphen separators', value: '314-555-5555'},
    {description: 'area code parenthesis', value: '(314)555-5555'},
    {description: 'area code parenthesis w/ space', value: '(314) 555-5555'},
    {description: 'area code missing parenthesis', value: '(314 555-5555'},
    {description: 'preceding 1', value: '1-314-555-5555'},
    {description: 'preceding 1, no spaces', value: '13145555555'},
    {description: 'preceding 1', value: '1 (314) 555-5555'},
    {description: 'preceding +1', value: '+1-314-555-5555'},
    {description: 'preceding +1, no spaces', value: '+13145555555'},
    {description: 'preceding +1', value: '+1 (314) 555-5555'},
    {description: 'extra spaces', value: '314   555-5555'},
    {description: 'extension x, no spaces', value: '3145555555x123'},
    {description: 'extension x, spaces', value: '3145555555  x  123'},
    {description: 'extension ext, no spaces', value: '3145555555ext123'},
    {description: 'extension ext, spaces', value: '3145555555   ext  123'},
    {description: 'extension, no spaces', value: '3145555555extension123'},
    {description: 'extension, spaces', value: '3145555555  extension  123'},
    {description: 'extension ext., no spaces', value: '3145555555ext.123'},
    {description: 'extension ext., spaces', value: '3145555555   ext.   123'}
  ],
  validAddresses: [
    {description: 'one line address', value: '1234 Test Rd St. Louis, MO 63110'},
    {description: 'two line address', value: '1234 Test Rd\rSt. Louis, MO 63110'}
  ]
  ,
  validOrgNames: [
    {description: 'letters only', value: 'Test Organization Name'},
    {description: 'letters and numbers', value: 'Test Organization Name 123'},
    {description: 'period present', value: 'Test Org. Name'},
  ],
  productCreator: function (name, IDSeed, orgIDSeed) {
    var testProductDoc = new Product();
    testProductDoc._id = new ObjectId(IDSeed);
    testProductDoc.approved = false;
    testProductDoc.name = name;
    testProductDoc.orgRef = new ObjectId(orgIDSeed);
    testProductDoc.pocName = 'test User Name';
    testProductDoc.pocEmail = 'test@test.com';
    testProductDoc.description = 'test';
    testProductDoc.category = ['test', 'test'];
    testProductDoc.webLink = 'http://www.test.com';
    return testProductDoc;
  },
  challengeCreator: function (name, IDSeed, orgIDSeed) {
    var testChallengeDoc = new Challenge();
    testChallengeDoc._id = new ObjectId(IDSeed);
    testChallengeDoc.name = name;
    testChallengeDoc.orgId = new ObjectId(orgIDSeed);
    testChallengeDoc.pocName = 'Tester@testy.com';
    testChallengeDoc.pocEmail = 'test@test.com';
    testChallengeDoc.description = 'Test Description';
    testChallengeDoc.requirementDescription = 'Do awesome things';
    testChallengeDoc.dayCount = 10;
    testChallengeDoc.startDate = new Date();
    testChallengeDoc.evaluationCriteria = 'Don\'t Suck';
    testChallengeDoc.summary = 'Place where fun and awesome happent';
    testChallengeDoc.stage = 'ScopingPreparation';
    return testChallengeDoc;
  },
  organizationCreator: function (name, IDSeed, orgIDType, type, approved) {
    var tstOrganization = new Organization();
    tstOrganization._id = new ObjectId(IDSeed);
    tstOrganization.orgName = name;
    tstOrganization.orgAddress = "";
    tstOrganization.orgWebsite = "";
    tstOrganization.orgRole = "";
    tstOrganization.orgType = (type || '');
    tstOrganization.orgId = {
      name: (orgIDType || 'DUNs'),
      value: IDSeed
    };

    tstOrganization.businessPocFirstName = "";
    tstOrganization.businessPocLastName = "";
    tstOrganization.businessPocPhone = "";
    tstOrganization.businessPocEmail = "";

    tstOrganization.technicalPocFirstName = "";
    tstOrganization.technicalPocLastName = "";
    tstOrganization.technicalPocPhone = "";
    tstOrganization.technicalPocEmail = "";

    tstOrganization.primaryPoc = "";
    tstOrganization.approved = (approved || false);
    return tstOrganization;

  },
  registrationCreator: function(IDSeed, challengeID, productID, orgID){
    var testRegistration = new Registration();
    testRegistration.challengeID = challengeID;
    testRegistration.productID = productID;
    testRegistration.orgRef = new ObjectId(orgID);
    testRegistration.pocName = "Test POC";
    testRegistration.pocEmail = "Test Email";
    testRegistration.description = "Test description";
    testRegistration.accessInstructions = "Test access instructions";
    testRegistration.otherDocuments = [];
    return testRegistration;
  },
  stringRepeater: function (str, rptCnt) {
    return new Array(rptCnt).join(str);
  },
  productSeeds: [
    {name: 'Test Product One', id: '1a1a1a21a1a1a1a1a1a1a1a1'}
  ],
  challengeSeeds: [
    {name: 'Test Discovery One', id: '1a1a1a21a1a1a1a1a1a1a1a2'}
  ],
  organizationSeeds: [
    {
      name: 'Test Organization One',
      IDSeed: '1a1a1a21a1a1a1a1a1a1a1a3',
      orgIDType: 'DUNs',
      type: 'Goverment',
      approved: true
    }
  ]
};