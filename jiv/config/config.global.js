var config = module.exports || {};
//==============================
//Main configuration file can be overidden with an env config like config.docker.js
//==============================
config.env = 'global';
config.port = parseInt(process.env.PORT, 10) || 3001;
config.hostname = 'localhost';
config.allowAnonymousUser = true;

//Chat Server information
config.chat = {
  server: 'localhost:',
  ui: ''
};

config.session = {
  //your secret string to use for hash
  secret: '234243534tgsdfge5t6dsfgw456werg5643y45ghsdf',
  cookiePath: '/',
  cookieDomain: 'localhost',
  cookieID: "gsm_Auth",
  mongo: {
    uri: 'localhost',
    db: 'gsm',
    sessionTable: 'sessions',
    userTable: 'accounts',
    port: 27017
  }
};


//=============================================
//mongo database
//=============================================
config.mongo = {};
config.mongo.uri = 'localhost';
config.mongo.db = 'gsm';

//=============================================
// Log Settings and Paths
//=============================================
config.logDirectory = __dirname + '/../../logs';
config.infoLogPath = config.logDirectory + '/';
config.errorLogPath = config.logDirectory + '/';
config.infoLogFileName = 'gsm_info.log';
config.errorLogFileName = 'gsm__error.log';

//=============================================
// Elastic Search
//=============================================
config.es = {};
config.es.uri = 'localhost';

//=============================================
// Swagger
//=============================================
config.swagger = {};
config.swagger.port = config.port;
config.swagger.base = 'http://' + config.hostname + ':' + config.port;

//=============================================
// Upload Settings
//=============================================
config.imageUploadDir = __dirname + '/../../uploads';

config.capabilitiesImageDir = config.imageUploadDir;
config.capabilitiesImageURL = '/images/products';

config.orgImageDir = config.imageUploadDir;
config.orgImageURL = '/images/organizations';

config.communityImageDir = config.imageUploadDir;
config.communityImageURL = '/images/community';

config.problemDocDir = config.imageUploadDir;
config.problemDocURL = '/docs';

config.privateFilesDir = __dirname + '/../../uploads';
config.privateFilesURL = '/private/files';

config.privateSolutionSubmissionFilesURL = config.privateFilesURL + '/solution-submissions';

//=============================================
// Notifier Settings
//=============================================
config.notifierSchedule = '0 7 * * 1-5'; // Weekdays at 7am
config.notifierTimeZone = 'America/New_York';
config.enableNotifier = false;

config.feedbackBccEmail = '';

//=============================================
// MISC
//=============================================
//configure your SMTP server
config.emailServer = {
  host: '',
  port: 587,
  secureConnection: true,
  auth: {
    user: '',
    pass: ''
  },
  tls: {
    ciphers: 'SSLv3'
  }
};
config.helpDeskEmail = '';

config.problemSubmitResponse = 'Thank you for submitting your Problem request! We will contact you within 1 business day to follow-up with your request.';
config.capabilitySubmitResponse = 'Thank you for submitting your Capability!';
config.registerationResponse = '<h1><span class="icon icon-thank-you-o"></span></h1><h3 class="text-center">Thank you submitting your Solution to this Problem!</h3><p>Please continue to participate in the Q&A. You will be notified when the Solution submission period has ended and the next step in the Problem has started.</p><hr />';

/*
 * Email Title: Welcome to ISM
 * Email Body:
 * Dear [Firstname] [Lastname]:
 * Thank you for signing up! Your account has been created. Please click the link below to complete your registration and set your password:
 * */
config.newUserEmailObj = {
  from: '',
  to: '',
  subject: 'Welcome to GSM!',
  text: '',
  html: ''
};

config.emailObj = {
  from: '',
  to: '',
  subject: '',
  text: '',
  html: ''
};

//NOTE: The list of valid upload file types for the site.
config.validUploadMimeTypes = [
  'image/png',
  'image/jpg',
  'image/jpeg',
  'text/csv',
  'application/pdf',
  'application/msword',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
];

config.validImageUploadTypes = [
  'image/png',
  'image/jpg',
  'image/jpeg'
];


//=============================================
// SAM.GOV Configuration Settings
//=============================================
//provide sam api key http://gsa.github.io/sam_api/sam/console/ to auto populate
var samGovApiKey = '';

config.setOptionsSamGovGet = function (duns, dunsPlus4) {
  var optionsSamGovGet = {
    host: 'api.data.gov',
    port: '443',
    path: '/sam/v1/registrations/' + duns + dunsPlus4 + '?api_key=' + samGovApiKey,
    method: 'GET'
  };
  return optionsSamGovGet;
};

//=============================================
// Disqus configuration
//=============================================
//provide disqus api info https://disqus.com/api/docs/
config.disqus = {
  publicKey: "",
  secretKey: "",
  shortname: ""
};
//=============================================
// Mailchimp Default Settings
//=============================================

//provide mailchim api info https://developer.mailchimp.com/
config.mailchimp = {
  listID: "",
  apiKey: '-us13'
};

module.exports = config;
