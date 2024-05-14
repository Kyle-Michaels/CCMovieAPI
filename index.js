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


// Listener
app.listen(8080, () => {
  console.log('App is listening on port 8080')
});