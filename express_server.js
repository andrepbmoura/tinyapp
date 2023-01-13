const express = require("express");
const app = express();
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const PORT = 8080; // default port 8080
const { randomGenString, getUserByEmail, urlsUser } = require('./helpers');

//Set EJS as the default view engine
app.set("view engine", "ejs");

//Middleware
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

//Database
const urlDatabase = {
  "b2xVn2": { longURL: "http://www.lighthouselabs.ca", userId: "isdpse" },
  "9sm5xK": { longURL: "http://www.google.com", userId: "isdpse" }
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
  isdpse: {
    id: "isdpse",
    email: "andre@lighthouselabs.ca",
    password: "123"
  }
};


//Routes

//Handles Login request
app.get('/login', (req, res) => {
  let templateVars = {
    user: req.cookies.userId ? getUserByEmail(req.cookies.userId, users) : null,
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
  if (user.password !== password) {
    return res.status(403).send('Incorrect password');
  }

  res.cookie('userId', user.id);
  res.redirect('/urls');
});

//Handles Logout request
app.post('/logout', (req, res) => {
  res.clearCookie('userId');
  res.redirect('/login');
});

//Handles registration of new users
app.get('/register', (req, res) => {
  let templateVars = {
    user: req.cookies.userId ? getUserByEmail(req.cookies.userId, users) : null,
  }
  res.render('urls_register', templateVars);
});

app.post('/register', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  //check if user provided an email and password
  if (!email || !password) {
    return res.status(400).send(`You must provide an email address and password to register! Try again to <a href=\"/Register\">register</a> to continue</body></html>`)
  };

  const user = getUserByEmail(email, users)

  //Throw an 400 error if the user already exists
  if (user) {
    return res.status(400).send(`User with email ${email} already exists! Try again to <a href=\"/Register\">register</a> to continue</body></html>`)
  };

  const userId = randomGenString(6);
  users[userId] = {
    id: userId,
    email,
    password,
  };

  console.log(users);
  res.cookie('userId', userId);
  res.redirect('/urls');
});


app.get("/", (req, res) => {
  res.send("Hello!");
});

//Reads all the URLS
app.get("/urls", (req, res) => {
  const userId = req.cookies.userId;
  const loggedUser = users[userId];
  const urls = urlsUser(userId, urlDatabase);

  let templateVars = {
    user: loggedUser, urls
  };
  //Check if the user is logged in and if not, throw an 401 error
  if (loggedUser) {
    res.render("urls_index", templateVars);
  } else {
    return res.status(401).send("<html><body>Please <a href=\"/login\">login</a> or <a href=\"/register\">register</a> to continue</body></html>\n"
    );
  }
});

app.post("/urls", (req, res) => {
  const userId = req.cookies.userId;
  const newUrl = randomGenString();

  if (!urlDatabase[userId]) {
    urlDatabase[userId] = {};
  }
  urlDatabase[newUrl] = { longURL: req.body.longURL, userId };
  res.redirect(`/urls/${newUrl}`);
});

//Creates new form
app.get('/urls/new', (req, res) => {  
  const userId = req.cookies.userId;
  const user = users[userId];
  const templateVars = { user };

  if (userId) {
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

app.get('/urls/:id', (req, res) => {
  const userId = req.cookies.userId;
  const shortURL = req.params.id;

  const templateVars = {
    user: users[userId], 
    id: shortURL,
    longURL: urlDatabase[shortURL].longURL
  };

  res.render('urls_show', templateVars);
});


app.post("/urls/:id/", (req, res) => {
  urlDatabase[req.params.id].longURL = req.body.longURL;
  res.redirect('/urls');
});

app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  const url = urlDatabase[shortURL];
  if (!url) {
    return res.status(404).send(`URL not found! Please try again: <a href=\"/urls\">Urls</a> `);
  }
  res.redirect(url.longURL);
});


//Delete
app.post("/urls/:id/delete", (req, res) => {
  const shortURLId = req.params.id;
  delete urlDatabase[shortURLId];

  res.redirect("/urls");
});

//Listener
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}!`);
});