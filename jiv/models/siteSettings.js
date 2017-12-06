var mongoose = require('mongoose');

Schema = mongoose.Schema;

var settingsSchema = new Schema({
  "configID": {type: String, required: true},
  "chatVersion": {type: String, required: false}
});

var siteSettings = mongoose.model('siteSettings', settingsSchema);

var _setVersion = function(version){
  _getAllSettings(function(settings){
    settings.chatVersion = version;
    settings.save();
  });
}

var _getSetting = function(setting, callback) {
  _getAllSettings(function(settings){
    var value = (settings[setting]) ? settings[setting] : "";
    callback(value);
  });
}

var _getSiteConfig = function(callback) {
  _getAllSettings(function(settings){
    callback(null, settings);
  });
}

var _getAllSettingsJSON = function(){
  _getAllSettings(function(settings){
    return settings.toJSON();
  })
}

var _getAllSettings = function (callback) {
  var handleError = function (err) {
    if (callback) {
      callback(err, null);
    }
    else {
      throw err;
    }
  };

  siteSettings.findOne({configID: "jivango"}).lean().exec(function (err, settings) {
    if (err) {
      handleError(err);
    }
    if (!settings) {
      settings = new siteSettings();
      settings.configID = "jivango";
      settings.save(function(err, settingsDoc){
        if (!err) {
          callback(settingsDoc)
        }
      });
    } else {
      callback(settings);
    }
  });
};

module.exports = {
  "model": siteSettings,
  "getSiteConfig": _getSiteConfig,
  "setVersion": _setVersion,
  "getAllSettingsJSON": _getAllSettingsJSON,
  "getSetting": _getSetting
};
