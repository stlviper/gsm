var cfg = require('../config');
var logger = require('../utils/logger');
var https = require('https');

var samGovHelper = {};

samGovHelper.getOrganizationInformation = function (duns, dunsPlus4, callback) {


  try {
    var optionsGet = cfg.setOptionsSamGovGet(duns, dunsPlus4);
    var requestGet = https.request(optionsGet).on('response', function (response) {
      var orgData = '';
      response.on('data', function (data) {
        orgData += data;
      });
      response.on('end', function () {
        var dataParsed = {};
        if (orgData === '') {
          return callback({message: 'No response received from SAM.Gov'}, null);
        } else {

          // this is our bunk org for testing in development only
          if ((process.env.NODE_ENV == 'local' || process.env.NODE_ENV == 'development-eb' || process.env.NODE_ENV == 'demo-eb') && duns == 000000000) {
            dataParsed = require('../config/ogs_samgov_output');
          } else {
            try {
              dataParsed = JSON.parse(orgData);
            }
            catch (err) {
                logger.error(err);
                return callback({message: 'Request to SAM.Gov failed. Please try again.'}, null);
              }
          }

          if (dataParsed.Code && dataParsed.Error) {
            return callback({message: dataParsed.Message}, null)
          }
          else if (typeof(dataParsed.sam_data) === 'undefined') {
            return callback({message: 'Request to SAM.Gov failed. Please try again.'}, null);
          }
          else if (typeof(dataParsed.sam_data.registration) === 'undefined') {
            return callback({message: 'Registration not found. Please first register in SAM.Gov'}, null);
          }
          else if (dataParsed.sam_data.registration.status !== 'ACTIVE') {
            return callback({message: 'Organization is NOT Active in SAM.Gov'}, null);
          } else {
            return callback(null, dataParsed);
          }
        }

      });
      response.on('error', function (err) {
        logger.error(err);
        return callback({message: err}, null);
      });
    }).end();
  } catch (err) {
    logger.error(err);
    callback({message: 'Request to SAM.Gov failed. Please try again.'}, null);
  }


};

module.exports = samGovHelper;
