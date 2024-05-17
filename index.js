// Require Dependancies
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const fs = require('fs');
const { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const morgan = require('morgan');
const mongoose = require('mongoose');
const Models = require('./models.js');
const { check, validationResult } = require('express-validator');


// Define app
const app = express();

// Define models
const Movies = Models.Movie;
const Users = Models.User;

/*---------- Middleware ----------*/

// BodyParser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cors
app.use(cors());

// Authentication
let auth = require('./auth')(app);
const passport = require('passport');
require('./passport');

// Logger
app.use(morgan('common'));

// Fileupload
app.use(fileUpload());

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


// Connect to database
mongoose.connect(process.env.CONNECTION_URI);


// S3 bucket variables
const s3Client = new S3Client({
  region: 'us-west-1'
})
const bucket = process.env.BUCKET_NAME;

/*---------- API Calls ----------*/

/* S3 Bucket API */

// Get images
app.get('/images', (req, res) => {
  listObjectParams = {
    Bucket: bucket
  };
  s3Client.send(new ListObjectsV2Command(listObjectParams))
    .then((listObjectResponse) => {
      res.send(listObjectsResponse.Contents)
    })
});

// Upload an image
const UPLOAD_TEMP_PATH = './temp'
app.post('/images', (req, res) => {
  const file = req.files.image
  const fileName = req.files.image.name
  const tempPath = `${UPLOAD_TEMP_PATH}/${fileName}`
  file.mv(tempPath, (err) => { res.status(500) })
  const putObjectParams = {
    Bucket: bucket,
    Key: fileName,
    Body: fs.readFileSync(tempPath)
  };
  s3Client.send(new PutObjectCommand(putObjectParams))
    .then((putObjectResponse) => {
      res.send(putObjectResponse)
    })
})

// Get image by name
app.get('/images/:fileName', async (req, res) => {
  getObjectParams = {
    Bucket: bucket,
    Key: req.params.fileName
  }
  await s3Client.send(new GetObjectCommand(getObjectParams))
    .then(async (getObjectResponse) => {
      res.writeHead(200, {
        'Content-Length': getObjectResponse.ContentLength
      });
      getObjectResponse.Body.transformToByteArray().then((buffer) => {
        res.end(buffer);
      });
    })
})

/* Website and Database API */

// Homepage
app.get('/', (req, res) => {
  res.send('Welcome to myFlix!');
});

/**
 * Handles Get request for all movies.
 * 
 * @function
 * @name getAllMovies
 * @param {Object} - Express request.
 * @param {Object} - Express response.
 * @returns {Promise<void>} - A promise that resolves when getAllMovies request is complete.
 * @throws {Error} - If permission is denied or unexpected error.
 * @returns {Object} []allMovies - An array of the movies collection.
 */
app.get('/movies', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Movies.find()
    .then((movies) => {
      res.status(201).json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    })
})

/**
 * Handles GET request for a single movie by title.
 * 
 * @function
 * @name getMovie
 * @param {Object} - Express request with movie title parameter.
 * @param {Object} - Express response.
 * @returns {Promise<void>} - A promise that resolves when the getMovie request process is complete.
 * @throws {Error} - If permission is denied or unexpected error.
 * @returns {Object} Movie - Object containing the requested movies data.
 */
app.get('/movies/:Title', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Movies.findOne({ Title: req.params.Title })
    .then((movie) => {
      res.status(201).json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error :' + err);
    })
})

/**
 * Handles GET request for a genre by name.
 * 
 * @function
 * @name getGenre
 * @param {Object} - Express request with genre name parameter.
 * @param {Object} - Express response.
 * @returns {Promise<void>} - A promise that resolves when the getGenre request process is complete.
 * @throws {Error} - If permission is denied or unexpected error.
 * @returns {Object} Genre - Object containing the requested genre data.
 */
app.get('/movies/genre/:genreName', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Movies.findOne({ "Genre.Name": req.params.genreName })
    .then((genre) => {
      res.status(201).json(genre.Genre);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error :' + err);
    })
})

/**
 * Handles GET request for a director by name.
 * 
 * @function
 * @name getDirector
 * @param {Object} - Express request with director name parameter.
 * @param {Object} - Express response.
 * @returns {Promise<void>} - A promise that resolves when the getDirector request process is complete.
 * @throws {Error} - If permission is denied or unexpected error.
 * @returns {Object} Director - Object containing the requested director data.
 */
app.get('/movies/directors/:directorName', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Movies.findOne({ "Director.Name": req.params.directorName })
    .then((director) => {
      res.status(201).json(director.Director);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error :' + err);
    })
})

/**
 * Handles POST request to register a new user.
 * 
 * @function
 * @name registerUser
 * @param {Object} - Express request.
 * @param {Object} - Express response.
 * @returns {Promise<void>} - A promise that resolves when registerUser request process is complete.
 * @throws {Error} - If permission is denied or unexpected error.
 * @returns {Object} newUser - New user object
 */
app.post('/users',
  [
    check('Username', 'Username requires a minimum length of 5 characters.').isLength({ min: 5 }),
    check('Username', 'Username is required.').not().isEmpty(),
    check('Username', 'Username contains non alphanumeric characters - not allowd.').isAlphanumeric(),
    check('Password', 'Password is required.').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ],
  async (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    let hashedPassword = Users.hashPassword(req.body.Password);
    await Users.findOne({ Username: req.body.Username })
      .then((user) => {
        if (user) {
          return res.status(400).send(req.body.Username + ' already exists.');
        } else {
          Users.create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday
          })
            .then((user) => {
              res.status(201).json(user)
            })
            .catch((err) => {
              console.error(err);
              res.status(500).send('Error: ' + err);
            })
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      })
  }
)

/**
 * Handles PUT request to update a user by username.
 * 
 * @function
 * @name updatedUser
 * @param {Object} - Express request with username parameter.
 * @param {Object} - Express response.
 * @returns {Promise<void>} - A promise that resolves when the updateUser request process is complete.
 * @throws {Error} - If permission is denied or an unexpected error.
 * @fires {Object} - updatedUser - Updated user object is sent in the response.
 * @description Expects at least one field to update in the request body
 */
app.put('/users/:Username', passport.authenticate('jwt', { session: false }), async (req, res) => {
  if (req.user.Username !== req.params.Username) {
    return res.status(400).send('Permission denied');
  }
  let hashedPassword = Users.hashPassword(req.body.Password);
  await Users.findOneAndUpdate({ Username: req.params.Username },
    {
      $set:
      {
        Username: req.body.Username,
        Password: hashedPassword,
        Email: req.body.Email,
        Birthday: req.body.Birthday
      }
    },
    { new: true })
    .then((updatedUser) => {
      res.json(updatedUser);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    })
})

/**
 * Handles POST request to add a movie to user's favorites.
 * 
 * @function
 * @name addToFavorites
 * @param {Object} - Express request with movieID and username perameters.
 * @param {Object} - Express response.
 * @returns {Promise<void>} - A promise that resolves when the addToFavorites request process is complete.
 * @throws {Error} - If permission is denied or unexpected error.
 * @returns {Object} updatedUser - Updated user object with movie added to FavoriteMovies array is sent in the response.
 */
app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }), async (req, res) => {
  if (req.user.Username !== req.params.Username) {
    return res.status(400).send('Permission denied.');
  }
  await Users.findOneAndUpdate({ Username: req.params.Username },
    {
      $push: { FavoriteMovies: req.params.MovieID }
    },
    { new: true })
    .then((updatedUser) => {
      res.json(updatedUser);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    })
})

/**
 * Handles DELETE request to remove a movie from user's favorites.
 * 
 * @function
 * @name removeFromFavorites
 * @param {Object} - Express request with movieID and username perameters.
 * @param {Object} - Express response.
 * @returns {Promise<void>} - A promise that resolves when the removeFromFavorites request process is complete.
 * @throws {Error} - If permission is denied or unexpected error.
 * @returns {Object} updatedUser - Updated user object with movie removed from FavoriteMovies array is sent in the response.
 */
app.delete('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }), async (req, res) => {
  if (req.user.Username !== req.params.Username) {
    return res.status(400).send('Permission denied.');
  }
  await Users.findOneAndUpdate({ Username: req.params.Username },
    {
      $pull: { FavoriteMovies: req.params.MovieID }
    },
    { new: true })
    .then((updatedUser) => {
      res.json(updatedUser)
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    })
})

/**
 * Handles DELETE request to delete user account.
 * 
 * @function
 * @name deleteUser
 * @param {Object} - Express request with username parameter.
 * @param {Object} - Express response.
 * @returns {Promise<void>} - A promise that resolves when the deleteUser request process is complete.
 * @throws {Error} - If permission is denied or an unexpected error.
 * @fires {string} Message - A message with the result of the user deletion process.
 */
app.delete('/users/:Username', passport.authenticate('jwt', { session: false }), async (req, res) => {
  if (req.user.Username !== req.params.Username) {
    return res.status(400).send('Permission denied.');
  }
  await Users.findOneAndDelete({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.Username + ' was not found.');
      } else {
        res.status(200).send(req.params.Username + ' was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    })
})


// Listener
app.listen(8080, () => {
  console.log('App is listening on port 8080')
});