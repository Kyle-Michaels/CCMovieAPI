const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Models = require('./models.js');
const passportJWT = require('passport-jwt');

let Users = Models.User,
  JWTStrattegy = passportJWT.Strategy,
  ExtractJWT = passportJWT.ExtractJwt;

passport.use(
  new LocalStrategy(
    {
      usernameField: 'Username',
      passwordField: 'Password',
    },
    async (username, password, callback) => {
      console.log(`${username} ${password}`);
      await Users.findOne({ Username: username })
        .then((user) => {
          if (!user) {
            console.log('Incorrect username.');
            return callback(null, false, {
              message: 'Incorrect username or password.',
            });
          }
          console.log('finished');
          return callback(null, user);
        })
        .catch((err) => {
          if (err) {
            console.log(err);
            return callback(err);
          }
        })
    }
  )
);