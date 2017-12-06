var sinon = require('sinon'),
  chai = require('chai'),
  expect = chai.expect,
  should = chai.should(),
  mongoose = require('mongoose'),
  testHlpr = require('../testHelpers'),
  regUpdate = require('../../models/registrations').update,
  regFactory = require('../../models/registrations').creator,
  Registration = require('../../models/registrations').Registration;

var ChallengeModel = mongoose.model('challenges');
var ProductModel = mongoose.model('product');
var RegistrationModel = mongoose.model('registration');
var OrganizationModel = mongoose.model('organizations');

describe('Registration Model/Object Methods', function () {
  describe('Factory()', function () {
    var _stubs = {
      challengeFind: null,
      challengeFindOne: null,
      productFind: null,
      productFindOne: null,
      organizationFind: null,
      registrationFindOne: null,
      registrationSave: null
    };

    var _testProducts = [];
    var _testChallenges = [];
    var _testOrganizations = [];

    before(function (done) {
      for (var orgIdx in testHlpr.organizationSeeds) {
        var organizationSeed = testHlpr.organizationSeeds[orgIdx];
        _testOrganizations.push(testHlpr.organizationCreator(organizationSeed.name, organizationSeed.id))
      }
      for (var challengeIdx in testHlpr.challengeSeeds) {
        var challengeSeed = testHlpr.challengeSeeds[challengeIdx];
        _testChallenges.push(testHlpr.challengeCreator(challengeSeed.name, challengeSeed.id))
      }
      for (var productIdx in testHlpr.productSeeds) {
        var productSeed = testHlpr.productSeeds[productIdx];
        _testProducts.push(testHlpr.productCreator(productSeed.name, productSeed.id))
      }

      _stubs.organizationFind = sinon.stub(OrganizationModel, 'find').yields(null, _testOrganizations);
      _stubs.challengeFind = sinon.stub(ChallengeModel, 'find').yields(null, _testChallenges);
      _stubs.productFind = sinon.stub(ProductModel, 'find').yields(null, _testProducts);
      done();
    });

    after(function (done) {
      //NOTE : Releasing all of the stubs
      for (var key in _stubs) {
        if (_stubs.hasOwnProperty(key)) {
          if (_stubs[key]) {
            _stubs[key].restore();
          }
        }
      }
      done();
    });

    it('Should return and error message if challengeID, orgref, POC Name, POC Email, or description is not filled out', function () {
      regFactory(null, null, null, null, null, null, null, null, null, function (err, regDoc) {
        should.exist(err);
        should.exist(regDoc);
        expect(err).to.be.a('Object');
        expect(err).to.have.property('message');
        expect(err.message).to.be.a('string');
        expect(err.message).to.equal('Please fill out all fields');
      });
      regFactory(_testChallenges[0]._id, '', '', '', '', '', '', '', null, function (err, regDoc) {
        should.exist(err);
        should.exist(regDoc);
        expect(err).to.be.a('Object');
        expect(err).to.have.property('message');
        expect(err.message).to.be.a('string');
        expect(err.message).to.equal('Please fill out all fields');
      });
      regFactory(_testChallenges[0]._id, _testProducts[0]._id, _testOrganizations[0]._id, '', '', '', '', '', null, function (err, regDoc) {
        should.exist(err);
        should.exist(regDoc);
        expect(err).to.be.a('Object');
        expect(err).to.have.property('message');
        expect(err.message).to.be.a('string');
        expect(err.message).to.equal('Please fill out all fields');
      });
      regFactory(_testChallenges[0]._id, _testProducts[0]._id, _testOrganizations[0]._id, 'test poc', '', '', '', '', null, function (err, regDoc) {
        should.exist(err);
        should.exist(regDoc);
        expect(err).to.be.a('Object');
        expect(err).to.have.property('message');
        expect(err.message).to.be.a('string');
        expect(err.message).to.equal('Please fill out all fields');
      });
      regFactory(_testChallenges[0]._id, _testProducts[0]._id, _testOrganizations[0]._id, 'test poc', 'test@test.com', '', '', '', null, function (err, regDoc) {
        should.exist(err);
        should.exist(regDoc);
        expect(err).to.be.a('Object');
        expect(err).to.have.property('message');
        expect(err.message).to.be.a('string');
        expect(err.message).to.equal('Please fill out all fields');
      });
      regFactory(_testChallenges[0]._id, _testProducts[0]._id, _testOrganizations[0]._id, 'test poc', 'test@test.com', 'description', '', '', null,
        function (err, regDoc) {
          should.exist(err);
          should.exist(regDoc);
          expect(err).to.be.a('Object');
          expect(err).to.have.property('message');
          expect(err.message).to.be.a('string');
          expect(err.message).to.equal('Please fill out all fields');
        });
    });
    it('Should now allow a registration without a white paper and product', function () {
      regFactory(_testChallenges[0]._id, null, _testOrganizations[0]._id, 'test poc', 'test@test.com', 'test description', 'access instructions', null, null,
        function (err, regDoc) {
          should.exist(err);
          should.exist(regDoc);
          expect(err).to.be.a('Object');
          expect(err).to.have.property('message');
          expect(err.message).to.be.a('string');
          expect(err.message).to.equal('Need to select a Product or submit a white paper in order to register');
        });
    });
    it('Should not allow descriptions to be over 200 hundred words', function () {
      var testDescription = testHlpr.stringRepeater(' Everything is AWESOME ', 100);
      regFactory(_testChallenges[0]._id, _testProducts[0]._id, _testOrganizations[0]._id, 'test poc', 'test@test.com', testDescription, '', '', null,
        function (err, regDoc) {
          should.exist(err);
          should.exist(regDoc);
          expect(err).to.be.a('Object');
          expect(err).to.have.property('message');
          expect(err.message).to.be.a('string');
          expect(err.message).to.equal('The description has to many words');
        });
    });
    it('Should not allow access instructions to be over 200 hundred words', function () {
      var testAccessInstructions = testHlpr.stringRepeater(' Everything is AWESOME ', 100);
      regFactory(_testChallenges[0]._id, _testProducts[0]._id, _testOrganizations[0]._id, 'test poc', 'test@test.com', 'test', testAccessInstructions, null, null,
        function (err, regDoc) {
          should.exist(err);
          should.exist(regDoc);
          expect(err).to.be.a('Object');
          expect(err).to.have.property('message');
          expect(err.message).to.be.a('string');
          expect(err.message).to.equal('The access instructions has too many words');
        });
    });
    it('Should not allow invalid emails', function () {
      for (var emailIdx in testHlpr.invalidEmails) {
        var invalidEmail = testHlpr.invalidEmails[emailIdx];
        regFactory(_testChallenges[0]._id, _testProducts[0]._id, _testOrganizations[0]._id, 'test poc', invalidEmail, 'description', '', '', null,
          function (err, regDoc) {
            should.exist(err);
            should.exist(regDoc);
            expect(err).to.be.a('Object');
            expect(err).to.have.property('message');
            expect(err.message).to.be.a('string');
            expect(err.message).to.equal('Invalid Email');
          });
      }
    });
    it('Should not allow duplicated registration for the same product and org to the same Discovery', function () {
      if (_stubs.registrationFindOne) {
        _stubs.registrationFindOne.restore();
      }
      _stubs.registrationFindOne = sinon.stub(RegistrationModel, 'findOne').yields(null, _testProducts[0]);
      regFactory(_testChallenges[0]._id, _testProducts[0]._id, _testOrganizations[0]._id, 'test poc', 'test@test.com',
        'description', 'access instructions', null, null,
        function (err, regDoc) {
          should.exist(err);
          should.exist(regDoc);
          expect(err).to.be.a('Object');
          expect(err).to.have.property('message');
          expect(err.message).to.be.a('string');
          expect(err.message).to.equal('This product is already registered for this Discovery');
        });
    });

    it('Should create a new registration if all fields/arguments are valid', function () {
      if (_stubs.registrationFindOne) {
        _stubs.registrationFindOne.restore();
      }
      _stubs.registrationFindOne = sinon.stub(RegistrationModel, 'findOne').yields(null, null);
      _stubs.registrationSave = sinon.stub(RegistrationModel.prototype, 'save').yields(null);
      _stubs.productFindOne = sinon.stub(ProductModel, 'findOne', function (query, callback) {
        if (query._id == _testProducts[0]._id) {
          callback(null, _testProducts[0]);
        }
        else {
          callback(null, null);
        }
      });
      _stubs.challengeFindOne = sinon.stub(ChallengeModel, 'findOne', function (query, callback) {
        if (query._id == _testChallenges[0]._id) {
          callback(null, _testChallenges[0]);
        }
        else {
          callback(null, null);
        }
      });
      regFactory(_testChallenges[0]._id, _testProducts[0]._id, _testOrganizations[0]._id, 'test poc', 'test@test.com',
        'description', 'access instructions', null, null,
        function (err, regDoc) {
          should.not.exist(err);
          should.exist(regDoc);
        });
    });
  });
  describe('Update()', function () {
    var _stubs = {
      challengeFind: null,
      productFind: null,
      organizationFind: null,
      registrationFindOne: null,
      registrationSave: null
    };

    var _registrationDoc = null;
    var _testProducts = [];
    var _testChallenges = [];
    var _testOrganizations = [];

    before(function (done) {

      for (var orgIdx in testHlpr.organizationSeeds) {
        var organizationSeed = testHlpr.organizationSeeds[orgIdx];
        _testOrganizations.push(testHlpr.organizationCreator(organizationSeed.name, organizationSeed.id))
      }
      for (var challengeIdx in testHlpr.challengeSeeds) {
        var challengeSeed = testHlpr.challengeSeeds[challengeIdx];
        _testChallenges.push(testHlpr.challengeCreator(challengeSeed.name, challengeSeed.id))
      }
      for (var productIdx in testHlpr.productSeeds) {
        var productSeed = testHlpr.productSeeds[productIdx];
        _testProducts.push(testHlpr.productCreator(productSeed.name, productSeed.id))
      }

      _registrationDoc = testHlpr.registrationCreator('1a1a1a21a1a1a1a1a1a1a1b2', _testChallenges[0]._id,
        _testProducts[0]._id, _testOrganizations[0]._id);
      _stubs.registrationFindOne = sinon.stub(RegistrationModel, 'findOne').yields(null, _registrationDoc);
      _stubs.organizationFind = sinon.stub(OrganizationModel, 'find').yields(null, _testOrganizations);
      _stubs.challengeFind = sinon.stub(ChallengeModel, 'find').yields(null, _testProducts);
      _stubs.productFind = sinon.stub(ProductModel, 'find').yields(null, _testChallenges);
      done();
    });
    after(function (done) {
      for (var key in _stubs) {
        if (_stubs.hasOwnProperty(key)) {
          if (_stubs[key]) {
            _stubs[key].restore();
          }
        }
      }
      done();
    });

    it('Should not allow an update if challengeID, orgref, POC Name, POC Email, or description are not filled out', function () {
      regUpdate(null, null, null, null, null, null, null, null, null, null, null, function (err, regDoc) {
        should.exist(err);
        should.exist(regDoc);
        expect(err).to.be.a('Object');
        expect(err).to.have.property('message');
        expect(err.message).to.be.a('string');
        expect(err.message).to.equal('Please fill out all fields');
      });
      regUpdate(_registrationDoc._id, _testChallenges[0]._id, null, '', '', '', '', '', '', '', null, function (err, regDoc) {
        should.exist(err);
        should.exist(regDoc);
        expect(err).to.be.a('Object');
        expect(err).to.have.property('message');
        expect(err.message).to.be.a('string');
        expect(err.message).to.equal('Please fill out all fields');
      });
      regUpdate(_registrationDoc._id, _testChallenges[0]._id, null, _testProducts[0]._id, _testOrganizations[0]._id, '', '', '', '', '', null, function (err, regDoc) {
        should.exist(err);
        should.exist(regDoc);
        expect(err).to.be.a('Object');
        expect(err).to.have.property('message');
        expect(err.message).to.be.a('string');
        expect(err.message).to.equal('Please fill out all fields');
      });
      regUpdate(_registrationDoc._id, _testChallenges[0]._id, null, _testProducts[0]._id, _testOrganizations[0]._id, 'test poc', '', '', '', '', null, function (err, regDoc) {
        should.exist(err);
        should.exist(regDoc);
        expect(err).to.be.a('Object');
        expect(err).to.have.property('message');
        expect(err.message).to.be.a('string');
        expect(err.message).to.equal('Please fill out all fields');
      });
      regUpdate(_registrationDoc._id, _testChallenges[0]._id, null, _testProducts[0]._id, _testOrganizations[0]._id, 'test poc', 'test@test.com', '', '', '', null, function (err, regDoc) {
        should.exist(err);
        should.exist(regDoc);
        expect(err).to.be.a('Object');
        expect(err).to.have.property('message');
        expect(err.message).to.be.a('string');
        expect(err.message).to.equal('Please fill out all fields');
      });
      regUpdate(_registrationDoc._id, _testChallenges[0]._id, null, _testProducts[0]._id, _testOrganizations[0]._id, 'test poc', 'test@test.com', 'description', '', '', null,
        function (err, regDoc) {
          should.exist(err);
          should.exist(regDoc);
          expect(err).to.be.a('Object');
          expect(err).to.have.property('message');
          expect(err.message).to.be.a('string');
          expect(err.message).to.equal('Please fill out all fields');
        });
    });
    it('Should not allow an update without a paper or product or both', function () {
      regUpdate(_registrationDoc._id, _testChallenges[0]._id, null, null, _testOrganizations[0]._id, 'test poc', 'test@test.com', 'test description', 'access instructions', null, null,
        function (err, regDoc) {
          should.exist(err);
          should.exist(regDoc);
          expect(err).to.be.a('Object');
          expect(err).to.have.property('message');
          expect(err.message).to.be.a('string');
          expect(err.message).to.equal('Need to select a Product or submit a white paper in order to register');
        });
    });
    it('Should not allow a descriptions to be over 200 hundred words', function () {
      var testDescription = testHlpr.stringRepeater(' Everything is AWESOME ', 100);
      regUpdate(_registrationDoc._id, _testChallenges[0]._id, null, _testProducts[0]._id, _testOrganizations[0]._id, 'test poc', 'test@test.com', testDescription, '', '', null,
        function (err, regDoc) {
          should.exist(err);
          should.exist(regDoc);
          expect(err).to.be.a('Object');
          expect(err).to.have.property('message');
          expect(err.message).to.be.a('string');
          expect(err.message).to.equal('The description has to many words');
        });
    });
    it('Should not allow a access instructions to be over 200 hundred words', function () {
      var testAccessInstructions = testHlpr.stringRepeater(' Everything is AWESOME ', 100);
      regUpdate(_registrationDoc._id, _testChallenges[0]._id, null, _testProducts[0]._id, _testOrganizations[0]._id, 'test poc', 'test@test.com', 'test', testAccessInstructions, null, null,
        function (err, regDoc) {
          should.exist(err);
          should.exist(regDoc);
          expect(err).to.be.a('Object');
          expect(err).to.have.property('message');
          expect(err.message).to.be.a('string');
          expect(err.message).to.equal('The access instructions has too many words');
        });
    });
    it('Should not allow invalid emails', function () {
      for (var emailIdx in testHlpr.invalidEmails) {
        var invalidEmail = testHlpr.invalidEmails[emailIdx];
        regUpdate(_registrationDoc._id, _testChallenges[0]._id, null, _testProducts[0]._id, _testOrganizations[0]._id, 'test poc', invalidEmail, 'description', '', '', null,
          function (err, regDoc) {
            should.exist(err);
            should.exist(regDoc);
            expect(err).to.be.a('Object');
            expect(err).to.have.property('message');
            expect(err.message).to.be.a('string');
            expect(err.message).to.equal('Invalid Email');
          });
      }
    });

    it('Should update a registration only if the product has valid outputs', function () {
      _registrationDoc.pocEmail = 'test@test.com';// correcting email from previous test
      var differentDescription = 'Different description';
      regUpdate(_registrationDoc._id, _registrationDoc.challengeID, null, _registrationDoc.productID,
        _registrationDoc.orgRef, _registrationDoc.pocName, _registrationDoc.pocEmail, differentDescription, _registrationDoc.accessInstructions,
        _registrationDoc.whitepaper, _registrationDoc.otherDocuments,
        function (err, regDoc) {
          should.not.exist(err);
          should.exist(regDoc);
          expect(err).to.be.a('Object');
          expect(regDoc).to.have.property('description');
          expect(regDoc.description).to.be.a('string');
          expect(regDoc.description).to.equal(differentDescription);
        });

      var differentPOCEmail = 'differnetPOC@email.com';
      regUpdate(_registrationDoc._id, _registrationDoc.challengeID, null, _registrationDoc.productID,
        _registrationDoc.orgRef, _registrationDoc.pocName, differentPOCEmail, _registrationDoc.description, _registrationDoc.accessInstructions,
        _registrationDoc.whitepaper, _registrationDoc.otherDocuments,
        function (err, regDoc) {
          should.not.exist(err);
          should.exist(regDoc);
          expect(err).to.be.a('Object');
          expect(regDoc).to.have.property('pocEmail');
          expect(regDoc.pocEmail).to.be.a('string');
          expect(regDoc.pocEmail).to.equal(differentPOCEmail);
        });

      var differentPOCName = 'Different POC Name';
      regUpdate(_registrationDoc._id, _registrationDoc.challengeID, null, _registrationDoc.productID,
        _registrationDoc.orgRef, differentPOCName, _registrationDoc.pocEmail, _registrationDoc.description, _registrationDoc.accessInstructions,
        _registrationDoc.whitepaper, _registrationDoc.otherDocuments,
        function (err, regDoc) {
          should.not.exist(err);
          should.exist(regDoc);
          expect(err).to.be.a('Object');
          expect(regDoc).to.have.property('pocName');
          expect(regDoc.pocName).to.be.a('string');
          expect(regDoc.pocName).to.equal(differentPOCName);
        });

      var differentAccessInstructions = '';
      regUpdate(_registrationDoc._id, _registrationDoc.challengeID, null, _registrationDoc.productID,
        _registrationDoc.orgRef, _registrationDoc.pocName, _registrationDoc.pocEmail, _registrationDoc.description, differentAccessInstructions,
        _registrationDoc.whitepaper, _registrationDoc.otherDocuments,
        function (err, regDoc) {
          should.not.exist(err);
          should.exist(regDoc);
          expect(err).to.be.a('Object');
          expect(regDoc).to.have.property('accessInstructions');
          expect(regDoc.accessInstructions).to.be.a('string');
          expect(regDoc.pocName).to.equal(differentAccessInstructions);
        });
    });

  });
});
