const express = require("express");
const app = express();
const morgan = require('morgan');
const cookieSession = require('cookie-session');
const bcrypt = require("bcryptjs");
const PORT = 8080; // default port 8080
const { randomGenString, getUserByEmail, urlsUser } = require('./helpers');

//Set EJS as the default view engine
app.set("view engine", "ejs");


/////////////
//MIDDLEWARE
////////////
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cookieSession({
  name: 'session',
  keys: ['string'],
  maxAge: 24 * 60 * 60 * 1000 //24 hours
}));


//Database
const urlDatabase = {
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "aJ48lW",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "aJ48lW",
  },
};

const users = {};


/////////////
//ROUTES
/////////////

//Handles Login request
app.get('/login', (req, res) => {
  const loggedUser = req.session.user;
  const templateVars = {
    user: users[loggedUser],
  }
  //Check if the user is already logged in and if not, redirect to the login page
  if (loggedUser) {
    return res.redirect("/urls");
  }
  res.render('urls_login', templateVars);
});

app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const user = getUserByEmail(email, users);

  //Throw an error if the email is not valid
  if (!user) {
    return res.status(403).send(`No user with email ${email} found! \b   <html><body>Try again to<a href=\"/login\"> login</a> or <a href=\"/Register\">register</a> to continue!</body></html>`);
  }
  //Throw an error if the password is incorrect
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(403).send('Incorrect password');
  }
  req.session.user = user.id;
  res.redirect('/urls');
});

//Handles Logout request
app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

//Handles registration of new users
app.get('/register', (req, res) => {
  const templateVars = {
    user: users[req.session.user]
  };

  //check if user is already logged in
  if (req.session.user) {
    return res.redirect('/urls');
  }
  res.render('urls_register', templateVars);
});

app.post('/register', (req, res) => {
  const email = req.body.email;
  const secretPassword = bcrypt.hashSync(req.body.password, 10);
  const id = randomGenString(6);
  const FoundUser = getUserByEmail(email, users)


  //check if user provided an email and password
  if (!email || !secretPassword) {
    return res.status(400).send(`You must provide an email address and password to register! Try again to <a href=\"/Register\">register</a> to continue</body></html>`)
  };

  //Throw an 400 error if the user already exists
  if (FoundUser) {
    return res.status(400).send(`User with email ${email} already exists! Try again to <a href=\"/Register\">register</a> to continue</body></html>`)
  };

  const user = {
    id,
    email,
    password: secretPassword
  };

  users[user.id] = user;
  console.log(users);
  req.session['user'] = user.id;
  res.redirect('/urls');
});

// If the user is already logged in or registered, redirect to the urls page
app.get('/', (req, res) => {
  const user = req.session.user;
  if (!user) {
    res.redirect('/login');
  }
  res.redirect('/urls');
});

//Reads all the URLS
app.get("/urls", (req, res) => {
  const loggedUser = req.session.user;
  const urls = urlsUser(loggedUser, urlDatabase);

  //Check if the user is logged in and if not, throw an 401 error
  if (!loggedUser) {
    return res.status(401).send("<html><body>Please <a href=\"/login\">login</a> or <a href=\"/register\">register</a> to continue</body></html>\n");
  }

  const templateVars = {
    user: users[loggedUser],
    urls: urls
  };

  res.render("urls_index", templateVars);
});

//Creates a new URL if the user is logged in
app.post("/urls", (req, res) => {
  const loggedUser = req.session.user;
  const newUrl = randomGenString();

  //Throw an error if the user is not logged in
  if (!loggedUser) {
    return res.status(401).send('You must <a href=\"/login\">login</a> to continue!');
  }
  urlDatabase[newUrl] = { longURL: req.body.longURL, userId: loggedUser };
  res.redirect(`/urls/${newUrl}`);
});


//Creates new form
app.get('/urls/new', (req, res) => {
  const loggedUser = req.session.user;
  const user = users[loggedUser];
  const templateVars = { user };

  // if user is logged in, than render the urls_new template, else redirect to the login page
  if (!loggedUser) {
    res.redirect("/login");
  }
  res.render("urls_new", templateVars);
});

app.get('/urls/:id', (req, res) => {
  const loggedUser = req.session.user;
  const shortURL = req.params.id;

  //if the user is not logged in or registered, throw an error
  if (!loggedUser) {
    return res.status(401).send('<html><body>Please <a href="/login">login</a> or <a href="/register">register</a> to create or edit URLS!</body></html>');
  }

  //If user does not own the URL, display error message
  if (urlDatabase[shortURL].userId !== loggedUser) {
    return res.status(401).send('You unauthorized to view this URL!');
  }

  //if URL does not exist, thrown an error
  if (!urlDatabase[shortURL]) {
    return res.status(404).send(`The selected URL ${shortURL} does not exist in the database`);
  }

  const templateVars = {
    user: users[loggedUser],
    id: shortURL,
    longURL: urlDatabase[shortURL].longURL
  };

  res.render('urls_show', templateVars);
});


app.post("/urls/:id/", (req, res) => {
  const shortURL = req.params.id;
  const user = req.session.user;

  //if the URL does not exist, thrown an error
  if (!urlDatabase[shortURL]) {
    return res.status(404).send(`The URL ${shortURL} does not exist in the database`);
  }

  //If no user logged in, display error message
  if (!user) {
    return res.status(401).send('<html><body>Please <a href="/login">login</a> or <a href="/register">register</a> to continue!</body></html>');
  }
  //If user does not own the URL, display error message
  if (urlDatabase[shortURL].userId !== user) {
    return res.status(401).send('You unauthorized to view this URL!');
  }
  urlDatabase[req.params.id].longURL = req.body.longURL;
  res.redirect('/urls');
});

app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;

  //if URL does not exist, display error message
  if (!urlDatabase[shortURL]) {
    return res.status(404).send(`URL not found! Please try again: <a href=\"/urls\">Urls</a> `);
  }
  const longURL = urlDatabase[shortURL].longURL;
  res.redirect(longURL);
});

//Delete
app.post("/urls/:id/delete", (req, res) => {
  const user = req.session.user;
  const shortURL = req.params.id;

  //if user is not logged in, thrown an error
  if (!user) {
    return res.status(401).send('<html><body>Please <a href="/login">login</a> or <a href="/register">register</a> to continue!</body></html>');
  }
  // if requested short url is not in the shortURLs array
  if (!urlDatabase[shortURL]) {
    return res.status(404).send("short URL does not exist in the database!");
  }
  //if user does not own the URL, display an error message
  if (urlDatabase[shortURL].userId !== user) {
    return res.status(401).send('You unauthorized to view this URL!');
  }
  const shortURLId = req.params.id;
  delete urlDatabase[shortURLId];

  res.redirect("/urls");
});

//Listener
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}!`);
});