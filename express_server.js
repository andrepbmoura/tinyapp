const express = require("express");
const app = express();
const morgan = require('morgan');
const cookieSession = require('cookie-session');
const bcrypt = require("bcryptjs");
const PORT = 8080; // default port 8080
const { randomGenString, getUserByEmail, urlsUser } = require('./helpers');

//Set EJS as the default view engine
app.set("view engine", "ejs");

//Middleware
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cookieSession({
  name: 'session',
  keys: ['string'],
  maxAge: 24 * 60 * 60 * 1000
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

const users = {
  "aJ48lW": {
    id: "aJ48lW",
    email: "user@example.com",
    password: "123",
  }
};

/////////////
//ROUTES
/////////////

//Handles Login request
app.get('/login', (req, res) => {
  const templateVars = {
    user: users[req.session["userId"]],
  }
  if (req.session.userId) {
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
  req.session.userId = user.id;
  res.redirect('/urls');
});

//Handles Logout request
app.post('/logout', (req, res) => {
  res.clearCookie("session")
  res.redirect('/login');
});

//Handles registration of new users
app.get('/register', (req, res) => {
  const templateVars = {
    user: users[req.session["userId"]]
  };
  res.render('urls_register', templateVars);
});

app.post('/register', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  //check if user provided an email and password
  if (!email || !password) {
    return res.status(400).send(`You must provide an email address and password to register! Try again to <a href=\"/Register\">register</a> to continue</body></html>`)
  };

  const FoundUser = getUserByEmail(email, users)

  //Throw an 400 error if the user already exists
  if (FoundUser) {
    return res.status(400).send(`User with email ${email} already exists! Try again to <a href=\"/Register\">register</a> to continue</body></html>`)
  };

  const id = randomGenString(6);
  const secretPassword = bcrypt.hashSync(password, 10);

  const user = {
    id,
    email,
    password: secretPassword
  };

  users[id] = user;
  console.log(users);
  req.session["userId"] = user.id;
  res.redirect('/urls');
});


app.get('/', (req, res) => {
  const loggedUser = req.session.userId;
  if (!loggedUser) {
    res.redirect('/login');
  }
  res.redirect('/urls');  
});

//Reads all the URLS
app.get("/urls", (req, res) => {
  const userId = req.session["userId"];
  const loggedUser = users[userId];
  const urls = urlsUser(userId, urlDatabase);

  const templateVars = {
    user: loggedUser,
    urls: urls
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
  const userId = req.session.userId;
  const newUrl = randomGenString();

  if (!userId) {
    return res.status(401).send('You must <a href=\"/login\">login</a> to continue!');
  }
  urlDatabase[newUrl] = { longURL: req.body.longURL, userId };
  res.redirect(`/urls/${newUrl}`);
});

//Creates new form
app.get('/urls/new', (req, res) => {
  const userId = req.session.userId;
  const user = users[userId];
  const templateVars = { user };

  if (userId) {
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

app.get('/urls/:id', (req, res) => {
  const userId = req.session.userId;
  const shortURL = req.params.id;

  if (!urlDatabase[shortURL]) {
    return res.status(404).send(`The selected URL ${shortURL} does not exist in the database`);
  }
  if (!userId) {
    return res.status(401).send('<html><body>Please <a href="/login">login</a> or <a href="/register">register</a> to create or edit URLS!</body></html>');
  }

  const templateVars = {
    user: users[userId],
    id: shortURL,
    longURL: urlDatabase[shortURL].longURL
  };

  res.render('urls_show', templateVars);
});


app.post("/urls/:id/", (req, res) => {
  const shortURL = req.params.id;
  const userId = req.session.userId;


  if (!urlDatabase[shortURL]) {
    return res.status(404).send(`The URL ${shortURL} does not exist in the database`);
  }

  //If no user logged in, display error message
  if (!userId) {
    return res.status(401).send('<html><body>Please <a href="/login">login</a> or <a href="/register">register</a> to continue!</body></html>');
  }
  //If user does not own the URL, display error message
  if (urlDatabase[shortURL].userId !== userId) {
    return res.status(401).send('You cannot access this URL');
  }
  urlDatabase[req.params.id].longURL = req.body.longURL;
  res.redirect('/urls');
});

app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  if (!urlDatabase[shortURL]) {
    return res.status(404).send(`URL not found! Please try again: <a href=\"/urls\">Urls</a> `);
  }
  const longURL = urlDatabase[shortURL].longURL;
  res.redirect(longURL);
});

//Delete
app.post("/urls/:id/delete", (req, res) => {
  const user = req.session.userId;
  const shortURL = req.params.id;

  if (!user) {
    return res.status(401).send("Please log in first!");
  }
  // if requested short url is not in the shortURLs array
  if (!urlDatabase[shortURL]) {
    return res.send("short URL does not exist in the database!");
  }

  if (urlDatabase[shortURL].userId !== user) {
    return res.send("You cannot view this URL");
  }
  const shortURLId = req.params.id;
  delete urlDatabase[shortURLId];

  res.redirect("/urls");
});

//Listener
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}!`);
});