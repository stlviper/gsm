var cfg = require('../config'),
  mongoose = require('mongoose'),
  mongoosastic = require('mongoosastic'),
  passport = require('passport'),
  objHlpr = require('../utils/objectTools'),
  stringHelpers = require('../utils/stringHelpers'),
  newsSchema = require('./newsPost').schema,
  newsValidate = require('./newsPost').validate,
  Schema = mongoose.Schema;

var categories = {
  analytics: 'analytics', collaboration: 'collaboration', cybersecurity: 'cybersecurity',
  gis: 'gis', imageprocessing: 'imageprocessing', infrastucture: 'infastructure', modeling: 'modeling',
  remotesensing: 'remotesensing', search: 'search', visualization: 'visualization'
};

var communityTypes = {open: 'open', private: 'private'};

var communitySchema = new Schema({
  name: {type: String, required: true, trim: true, index: {unique: true}},
  urlFriendlyID: {type: String, required: true, trim: true},
  description: {type: String, required: false, trim: true},
  owner: {type: Schema.Types.ObjectId, required: true},
  type: {type: String, enum: objHlpr.getValues(communityTypes), trim: true},
  emailDomain: {type: String, required: false, trim: true},
  categories: [{type: String, trim: true}],
  logoUrl: {type: String, required: false, trim: true},
  jumbotronUrl: {type: String, required: false, trim: true},
  members: [{type: Schema.Types.ObjectId, required: false}],
  discoveries: [{type: Schema.Types.ObjectId, required: false}],//NOTE: When a discovery is "POSTED" add the _id to this array
  solutions: [{type: Schema.Types.ObjectId, required: false}],//NOTE: When a solution is "POSTED" add the _id to this array
  news: [newsSchema],
  approved: {type: Boolean, required: true, default: false},
  dateAdded: {type: Date, required: false, default: Date.now()},
  whyJoin: {type: String},
  caption: {type: String},
  discoveryLength: {type: String},
  productLength: {type: String},
  tabTitle: {type: String},
  tabContent: {type: String},
  showTab: { type: Boolean, default: false },
  tabTitle2: { type: String },
  tabContent2: { type: String },
  showTab2: { type: Boolean, default: false }
});
communitySchema.plugin(mongoosastic, {host: String(cfg.es.uri)});

var communities = mongoose.model('communities', communitySchema);

var validate = function (communityObj, callback) {
  if (!communityObj || !(communityObj.name && communityObj.name.length > 0)) {
    callback({message: 'You mush enter in a name for your community'}, communityObj);
  }
  else if (!communityObj.owner) {
    callback({message: 'Must have a organization reference'}, communityObj);
  }
  else if (!communityObj.description) {
    callback({message: 'Must have a description'}, communityObj);
  }
  else {
    callback(null, communityObj);
  }
};

var creator = function (communityObj, callback) {
  validate(communityObj, function (valErr) {
    if (valErr) {
      callback(valErr, communityObj);
    }
    else {
      communityObj.urlFriendlyID = stringHelpers.getUrlFriendlyString(communityObj.name);
      communityObj.type = communityTypes.open;
      var newCommunity = new communities(communityObj);
      newCommunity.save(function (saveErr) {
        if (saveErr) {
          callback(saveErr, communityObj);
        }
        else {
          callback(null, communityObj);
        }
      });
    }
  });
};

var update = function (id, communityObj, callback) {
  validate(communityObj, function (valErr) {
    if (valErr) {
      callback(valErr, communityObj);
    }
    else {
      if (!id) {
        id = communityObj._id || communityObj.id;
      }

      if (id) {
        delete communityObj._id;
        delete communityObj.id;
        communities.update({_id: id}, communityObj, function (updateErr, updatedDoc) {
          if (updateErr) {
          }
          else {
            callback(null, updatedDoc);
          }
        });
      }
      else {
        callback({message: 'No ID is given for in order to find the document to update'}, communityObj);
      }
    }
  });
};

var addNewsPost = function (communityID, newsPostObj, callback) {
  if (!newsPostObj) {
    callback({messaage: "newsPostObj cannot be null or undefined"});
  }
  else {
    newsValidate(newsPostObj, function (newsErr) {
      if (newsErr) {

          var filename = newsPostObj.image.path.split('/');
          var path = cfg.imageUploadDir+'/'+filename[filename.length-1];

                  fs.unlink(path, function (delErr) {
                      if (delErr) {
                          logger.error(delErr);
                          callback({ message: 'There was an error with your request' });
                      }
                      else {
                          callback({ message: 'Invalid file type' });
                      }
                  });

          
      }
      else {
        communities.findOneAndUpdate({_id: communityID}, {$pushAll: {news: [newsPostObj]}}, {upsert: false},
          function (updateErr, communityDoc) {
            if (updateErr) {
              callback(updateErr, communityDoc);
            }
            else {
              callback(null, communityDoc);
            }
          }
        );
      }
    });
  }
};

var updateNewsPost = function (communityID, newsID, updatedPostObj, callback) {
  if (!updatedPostObj || !updatedPostObj.urlFriendlyID || !communityID) {
    callback({messaage: "newsPostObj cannot be null or undefined"});
  }
  else {
    newsValidate(updatedPostObj, function (newsErr) {
      if (newsErr) {
        callback(newsErr);
      }
      else {
        communities.findOneAndUpdate({"urlFriendlyID": communityID, "news.urlFriendlyID": newsID},
          {
            "$set": {
              "news.$": updatedPostObj
            }
          },
          function (updateErr, communityDoc) {
            if (updateErr) {
              callback(updateErr, communityDoc);
            }
            else {
              callback(null, communityDoc);
            }
          }
        );
      }
    });
  }
};

var removeNewsPost = function (urlFriendlyID, newsUrlFriendlyID, callback) {
  communities.findOneAndUpdate({'urlFriendlyID': urlFriendlyID},
    {'$pull': {'news': {"urlFriendlyID": newsUrlFriendlyID}}},
    function (err, doc) {
      callback(err, doc);
    });
};

module.exports = {
  model: communities,
  creator: creator,
  update: update,
  validate: validate,
  addNewsPost: addNewsPost,
  updateNewsPost: updateNewsPost,
  removeNewsPost: removeNewsPost,
  communityTypes: communityTypes
};