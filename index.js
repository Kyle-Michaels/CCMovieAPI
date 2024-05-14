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


// Listener
app.listen(8080, () => {
  console.log('App is listening on port 8080')
});