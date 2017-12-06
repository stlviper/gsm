var product = require('../../models/products'),
  testHlpr = require('../testHelpers'),
  sinon = require('sinon'),
  chai = require('chai'),
  expect = chai.expect,
  should = chai.should(),
  mongoose = require('mongoose');

var ObjectId = mongoose.Types.ObjectId;
var Product = product.model;
var ProductModel = mongoose.model('product');
var factory = product.creator;
var update = product.update;


describe('Product Model/Object Methods', function () {

  //===========================================
  // Factory Method Invalid arguments
  //===========================================
  describe('Factory()', function () {
    it('Should mark products with bad email address invalid', function () {
      for (var idx in testHlpr.invalidEmails) {
        factory(false, 'Test Object One', new ObjectId('1a1a1a21a1a1a1a1a1a1a1a1'), 'test User Name',
          testHlpr.invalidEmails[idx], 'test', ['test', 'test'], 'http://www.test.com', null,
          function (err, docObj) {
            should.exist(err);
            should.exist(docObj);
            expect(err, 'Error Object').to.be.a('Object');
            expect(err, 'Error Object').to.have.property('message');
            expect(err.message, 'Error Object').to.be.a('string');
            expect(err.message, 'Error Object').to.equal('Invalid email address');
          });
      }
    });
    it('Should mark products with bad web links invalid', function () {
      for (var idx in testHlpr.invalidUrls) {
        factory(false, 'Test Object One', new ObjectId('1a1a1a21a1a1a1a1a1a1a1a1'), 'test User Name',
          'test@test.com', 'test', ['test', 'test'], testHlpr.invalidUrls[idx].value, null,
          function (err, docObj) {
            should.exist(err);
            should.exist(docObj);
            expect(err, 'Error Object').to.be.a('Object');
            expect(err, 'Error Object').to.have.property('message');
            expect(err.message, 'Error Object').to.be.a('string');
            expect(err.message, 'Error Object').to.equal('Invalid web link');
          });
      }
    });
    it('Should mark invalid not all required fields are complete', function () {
      factory(false, '', new ObjectId('1a1a1a21a1a1a1a1a1a1a1a1'), 'test User Name',
        'test@test.com', 'test', ['test', 'test'], 'http://www.test.com', null,
        function (err, docObj) {
          should.exist(err);
          should.exist(docObj);
          expect(err).to.be.a('Object');
          expect(err, 'Error Object').to.have.property('message');
          expect(err.message, 'Error Object').to.be.a('string');
          expect(err.message, 'Error Object').to.equal('Please fill out all required fields');
        });
    });
    it('Return the new object if all is successful', function () {
      var productName = 'Awesome Product';
      factory(false, productName, new ObjectId('1a1a1a21a1a1a1a1a1a1a1a1'), 'test User Name',
        'test@test.com', 'test', ['test', 'test'], 'http://www.test.com', null,
        function (err, docObj) {
          should.not.exist(err);
          should.exist(docObj);
          expect(docObj.name).to.equal(productName);
        });
    });
  });

  //===========================================
  // Update Method Invalid arguments
  //===========================================
  describe('Update()', function () {
    var _productFindStub = null;
    var _productSaveStub = null;
    var _testProducts = [];
    before(function (done) {
      for (var idx in testHlpr.productSeeds) {
        var seed = testHlpr.productSeeds[idx];
        _testProducts.push(testHlpr.productCreator(seed.name, seed.id));
      }
      _productFindStub = sinon.stub(ProductModel, 'find').yields(null, _testProducts);
      done();
    });
    it('Should not update a product with bad email address invalid', function () {
      for (var idx in testHlpr.invalidEmails) {
        update(testHlpr.productSeeds[0].id, false, 'Test Object One', new ObjectId('1a1a1a21a1a1a1a1a1a1a1a1'), 'test User Name',
          testHlpr.invalidEmails[idx], 'test', ['test', 'test'], 'http://www.test.com', null,
          function (err, docObj) {
            should.exist(err);
            should.exist(docObj);
            expect(err, 'Error Object').to.be.a('Object');
            expect(err, 'Error Object').to.have.property('message');
            expect(err.message, 'Error Object').to.be.a('string');
            expect(err.message, 'Error Object').to.equal('Invalid email Address');
          });
      }
    });
    it('Should not update a product with bad web links invalid', function () {
      for (var idx in testHlpr.invalidUrls) {
        update(_testProducts[0]._id, false, 'Test Object One', new ObjectId('1a1a1a21a1a1a1a1a1a1a1a1'), 'test User Name',
          'test@test.com', 'test', ['test', 'test'], testHlpr.invalidUrls[idx].value, null,
          function (err, docObj) {
            should.exist(err);
            should.exist(docObj);
            expect(err, 'Error Object').to.be.a('Object');
            expect(err, 'Error Object').to.have.property('message');
            expect(err.message, 'Error Object').to.be.a('string');
            expect(err.message, 'Error Object').to.equal('Invalid web link');
          });
      }
    });
    it('Should not update a product if not all required fields are filled', function () {
      update(_testProducts[0]._id, false, '', new ObjectId('1a1a1a21a1a1a1a1a1a1a1a1'), 'test User Name',
        'test@test.com', 'test', ['test', 'test'], 'http://www.test.com', null,
        function (err, docObj) {
          should.exist(err);
          should.exist(docObj);
          expect(err).to.be.a('Object');
          expect(err, 'Error Object').to.have.property('message');
          expect(err.message, 'Error Object').to.be.a('string');
          expect(err.message, 'Error Object').to.equal('Please fill out all required fields');
        });
    });
    it('Should update a product if all fields are correct', function () {
      _productSaveStub = sinon.stub(ProductModel.prototype, 'save').yields(null);
      var updatedName = 'Everything is awesome';
      update(_testProducts[0]._id, false, updatedName, new ObjectId('1a1a1a21a1a1a1a1a1a1a1a1'), 'test User Name',
        'test@test.com', 'test', ['test', 'test'], 'http://www.test.com', null,
        function (err, docObj) {
          should.not.exist(err);
          should.exist(docObj);
          expect(docObj.name).to.equal(updatedName);
        });
    });

    after(function (done) {
      //NOTE: Releasing the stubs so another test can stub as needed.
      _productFindStub.restore();
      _productSaveStub.restore();
      done();
    });
  });
});