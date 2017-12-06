var nodemailer = require('nodemailer'),
  cfg = require('../config'),
  logger = require('./logger');

// create reusable transporter object using SMTP transport
var transporter = nodemailer.createTransport(cfg.emailServer);

module.exports = {
  /**
   * *
   * @param mailOptions object. {from: '', to: '', subject: '', text: '', html: ''}
   */
  sendEmail: function (mailOptions) {
    var now = new Date();
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        logger.error('Error (' + now + '): ' + error);
      } else {
        logger.info('Message response(' + now + '): ' + info.response);
        logger.info('Message ID(' + now + '): ' + info.messageId);
        logger.info('Message Accepted(' + now + '): ' + info.accepted);
      }
    });
  }
};

