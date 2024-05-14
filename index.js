// Require Dependancies
const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const morgan = require('morgan');

// Define app
const app = express();

/*---------- Middleware ----------*/

// Logger
app.use(morgan('common'));

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});




/*---------- API Calls ----------*/

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
app.get('/movies', async (req, res) => {
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
app.get('movies/:Title', async (req, res) => {
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
app.get('/movies/genre/:genreName', async (req, res) => {
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
app.get('/movies/directors/:directorName', async (req, res) => {
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


// Listener
app.listen(8080, () => {
  console.log('App is listening on port 8080')
});