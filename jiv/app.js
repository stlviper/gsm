var express = require('express'),
  path = require('path'),
  favicon = require('serve-favicon'),
  logger = require('./utils/logger'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  mongoose = require('mongoose'),
  passport = require('passport'),
  expressSession = require('express-session'),
  mongoStore = require('connect-mongo')(expressSession),
  account = require('./models/accounts').model,
  localStrategy = require('passport-local').Strategy,
  validator = require('./utils/validation'),
  multer = require('multer'),
  auth = require('./auth'),
  cfg = require('./config'),
  flash = require('connect-flash'),
  basic = require('./routes/user'),
  admin = require('./routes/admin'),
  welcome = require('./routes/welcome'),
  apiRoutes = require('./routes/api'),
  fs = require('fs'),
  hbsHelpers = require('./utils/hbsHelpers'),
  expressValidator = require('express-validator'),
  join = require('./routes/join');

// Passport Set up
//==================================================================================
passport.use('login', new localStrategy({passReqToCallback: true}, auth.login));
passport.serializeUser(auth.serializeUser);
passport.deserializeUser(auth.deserializeUser);

// Swagger Settings
//==================================================================================
//TODO: We should do this soon

// Setting up /tmp directories for Beanstalk (can't save to the app directory in
// Beanstalk)
//==================================================================================
if (process.env.NODE_ENV === 'production-eb' || process.env.NODE_ENV === 'development-eb'
    || process.env.NODE_ENV === 'demo-eb' || process.env.NODE_ENV === 'production-gsm') {
  // Logs
  if (!fs.existsSync(cfg.logDirectory)){
    fs.mkdirSync(cfg.logDirectory);
  }
  fs.stat(cfg.logDirectory + '/jiv_info.log', function (err, stat) {
    if(err == null) {
      //console.log('File exists');
    } else if(err.code == 'ENOENT') {
      fs.writeFile(cfg.logDirectory + '/jiv_info.log', '');
    } else {
      console.log('Error: ', err.code);
    }
  });
  fs.stat(cfg.logDirectory + '/jiv_error.log', function (err, stat) {
    if(err == null) {
      //console.log('File exists');
    } else if(err.code == 'ENOENT') {
      fs.writeFile(cfg.logDirectory + '/jiv_error.log', '');
    } else {
      console.log('Error: ', err.code);
    }
  });
  // Uploads
  if (!fs.existsSync(cfg.imageUploadDir)){
    fs.mkdirSync(cfg.imageUploadDir);
  }
}


// Setting up Mongoose
//==================================================================================
try {
  mongoose.connect('mongodb://' + cfg.mongo.uri + '/' + cfg.mongo.db);
}
catch (err) {
  console.error(err);
}

// App Configuration
//==================================================================================
var app = express();
app.use(expressSession({
  secret: cfg.session.secret,
  name: cfg.session.cookieID,
  cookie: {domain: cfg.session.cookieDomain, path: cfg.session.cookiePath, httpOnly: true, secure: false, maxAge: null},
  secure: true,
  resave: false,
  saveUninitialized: false,
  store: new mongoStore({
    db: cfg.mongo.db,
    host: cfg.mongo.uri,
    port: 27017,
    mongooseConnection: mongoose.connection
  })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(auth.setUserInformation);
app.use(auth.setPreviousPage);
app.use(expressValidator());

app.use(function(req, res, next) {
  var siteSettings = require('./models/siteSettings');
  return siteSettings.getSiteConfig(function(err, siteConfig) {
    if (err) return next(err);
    req.session.siteConfig = siteConfig;
    res.locals.siteConfig = siteConfig;
    return next();
  });
});


// Load user defined strings
//app.locals.strings = require('./config/strings');
app.use(function (req, res, next) {
  res.locals.strings = require('./config/strings');
  res.locals.config = cfg;
  res.locals.hostname = cfg.externalHostname;
  res.locals.geoIntCommunityUrlFriendlyId = 'geoint-solutions-marketplace';
  next();
});

// View engine setup
//==================================================================================
var hbs = require('hbs');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
hbs.registerPartials(__dirname + '/views/partials');
hbs.registerPartials(__dirname + '/views/themes');

for (var methodName in hbsHelpers) {
  if (hbsHelpers.hasOwnProperty(methodName)) {
    if (methodName === 'getDebug') {
      hbs.registerHelper('debug', hbsHelpers[methodName]);
    }
    else {
      hbs.registerHelper(methodName, hbsHelpers[methodName]);
    }
  }
}

// Setting the Theme of the site
//==================================================================================
app.set('view options', {layout: 'themes/default/layout'});
if (cfg.useS3 !== true) {
  app.use(cfg.capabilitiesImageURL, express.static(cfg.capabilitiesImageDir));
  app.use(cfg.orgImageURL, express.static(cfg.orgImageDir));
  app.use(cfg.problemDocURL, express.static(cfg.problemDocDir));
  app.use(cfg.communityImageURL, express.static(cfg.communityImageDir));
  //app.use(favicon(__dirname + '/public/images/themes/default/favicon.ico'));
}

// uncomment after placing your favicon in /public
app.use(require('morgan')("combined", {"stream": logger.stream}));
app.use(bodyParser.json({limit: '50mb'})); // for parsing application/json
app.use(bodyParser.urlencoded({limit: '50mb', extended: true})); // for parsing application/x-www-form-urlencoded

var multerConfig = multer({
  dest: cfg.imageUploadDir,
  limits: {
    fileSize: 20971520, //NOTE 10mb upload restriction
    fieldSize: 100000000 // NOTE 100mb. Requested to be increased from 1mb by Bill Hughes
  },
  onFileUploadStart: function (file) {
    
  },
  // NOTE: The file will be written to the server and after it is fully written it will be transferred to S3 (hence
  //       the S3 transfer occurring under onFileUploadComplete)
  onFileUploadComplete: function (file) {
      if (!validator.isValidUploadFileType(file.mimetype)) {
          logger.info(' Invalid File type: ' + file.mimetype);
          return false;
      } else {
          logger.info(file.fieldname + ' of type ' + file.mimetype + ' is starting ...');
      }
    if (cfg.useS3) {
      fs.readFile(file.path, function (err, data) {

        var params = {
          Bucket: cfg.privateHostPath,
          Key: cfg.privateDirectoryPath + '/' + file.name,
          Body: data
        };

        cfg.s3.putObject(params, function (err, res) {
          if (err) {
            logger.error('File upload ' + file.name + ' failed.');
          }
          else {
            // Delete the file saved locally
            // NOTE: LH: Don't delete the file right now, since pages could display the 'no image' filler
            //           until the file has been fully uploaded to S3.
            // fs.unlink(file.path);
            logger.info(file.fieldname + ' uploaded to  ' + file.path);
          }
        });
        logger.info(data.length + ' of ' + file.fieldname + ' arrived');
      });
    }
  },
  onFileSizeLimit: function (file) {
    logger.log('Failed: ', file.originalname);
    fs.unlink('./' + file.path);// delete the partially written file
  },
  onError: function (error, next) {
    logger.error(error);
    next(error);
  }
});

app.use(multerConfig); // for parsing multipart/form-data
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/join', join);
app.use('/', basic(passport));
app.use('/admin', admin);
app.use('/welcome', welcome);
app.use('/api', apiRoutes);
app.use('/autodiscover', express.static(__dirname + '/autodiscover'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.request = {
    origin: req.get('origin'),
    url: req.originalUrl,
    params: req.params,
    query: req.query
  };
  if(req.user){
    err.user = {
      id: req.user.id.toString(),
      email: req.user.email
    };
  }
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    logger.error(err);
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}
else {
// production error handler
// no stacktraces leaked to user
  app.use(function (err, req, res, next) {
    logger.error(err);
    res.status(err.status || 500);
    res.render('404');
  });
}

module.exports = app;
//test