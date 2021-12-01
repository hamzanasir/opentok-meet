const express = require('express');
const fs = require('fs');
const OpenTok = require('opentok');
const https = require('https');
const compression = require('compression');
const redis = require('redis');
const url = require('url');
const glob = require('glob');
const path = require('path');
const cookieSession = require('cookie-session');
const passport = require('passport');
const initGoogleAuth = require('./server/auth/google-auth');


const app = express();
let config;

if (process.env.HEROKU || process.env.TRAVIS) {
  config = {
    baseUrl: process.env.BASE_URL,
    port: process.env.PORT,
    apiKey: process.env.OT_API_KEY,
    apiSecret: process.env.OT_API_SECRET,
    chromeExtensionId: process.env.CHROME_EXTENSION_ID,
    apiUrl: process.env.OT_API_URL || 'https://api.dev.opentok.com',
    opentokJs: process.env.OT_JS_URL || 'https://www.dev.tokbox.com/v2/js/opentok.js',
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    sessionHash: process.env.SESSION_HASH,
  };
} else {
  try {
    config = JSON.parse(fs.readFileSync('./config.json'));
  } catch (err) {
    console.log('Error reading config.json - have you copied config.json.sample to config.json? ', err);
    process.exit();
  }
}

if (config.clientId) {
  initGoogleAuth(config);
}

let redisClient;
if (process.env.REDISTOGO_URL) {
  const rtg = url.parse(process.env.REDISTOGO_URL);
  redisClient = redis.createClient(rtg.port, rtg.hostname);
  redisClient.auth(rtg.auth.split(':')[1]);
} else if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
} else {
  redisClient = redis.createClient();
}


app.use(cookieSession({
  name: 'meet-session',
  keys: [config.sessionHash],
}));
app.use(compression());
app.use(express.logger());
app.use(passport.initialize());
app.use(passport.session());

app.configure(() => {
  app.set('views', `${__dirname}/views`);
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(`${__dirname}/public`));
  app.use(app.router);
});

const ot = new OpenTok(config.apiKey, config.apiSecret, config.apiUrl);
const useSSL = fs.existsSync(`${__dirname}/server.key`) &&
  fs.existsSync(`${__dirname}/server.crt`);

require('./server/routes.js')(app, config, redisClient, ot, useSSL || process.env.HEROKU);


glob.sync('./plugins/**/*.js').forEach((file) => {
  // eslint-disable-next-line
  require(path.resolve(file))(app, config, redisClient, ot);
});

if (process.env.HEROKU || !useSSL) {
  app.listen(config.port, () => {
    console.log(`Listening on ${config.port}`);
  });
} else {
  https.createServer({
    key: fs.readFileSync('./server.key', 'utf8'),
    cert: fs.readFileSync('./server.crt', 'utf8'),
  }, app).listen(config.port, () => {
    console.log(`Listening on ${config.port}`);
  });
}
