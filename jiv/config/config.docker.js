var config = require('./config.global');

config.env = 'local';
config.port = parseInt(process.env.PORT, 10) || 3001;
config.hostname = '0.0.0.0';
config.allowAnonymousUser = true;

config.externalHostname = 'http://localhost:' + config.port;

config.session = {
    secret: 'asfsfs4r34gfergafsdfgw54tgesrfvse4563',
    cookiePath: '/',
    cookieDomain: '',
    cookieID: "gsm_auth",
    mongo: {
        uri: 'gsm-mongoDB',
        db: 'gsm',
        sessionTable: 'sessions',
        userTable: 'accounts',
        port: 27017
    }
};

//=============================================
// mongo database Overrides
//=============================================
config.mongo = {};
config.mongo.uri = 'gsm-mongoDB';
config.mongo.db = 'gsm';


module.exports = config;
