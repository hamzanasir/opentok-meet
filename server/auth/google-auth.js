const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;

module.exports = (config) => {
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  passport.use(new GoogleStrategy(
    {
      clientID: config.clientId,
      clientSecret: config.clientSecret,
      callbackURL: `${config.baseUrl}/google/callback`,
      passReqToCallback: true,
    },
    (request, accessToken, refreshToken, profile, done) => done(null, profile)
  ));
};
