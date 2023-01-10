const express = require("express");
const app = express();
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const PORT = 8080; // default port 8080
app.set("view engine", "ejs"); //Set EJS as the default view engine
const { randomGenString, cookieHasUser } = require('./helpers');

//Middleware
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

//Database
const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const usersDatabase = {};

//Routes

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

//Reads all the URLS
app.get('/urls', (req, res) => {
  const templateVars = { username: req.cookies["username"], urls: urlDatabase };
  res.render('urls_index', templateVars);
});


app.post("/urls", (req, res) => {
  const id = randomGenString();
  console.log(id)
  console.log(urlDatabase)
  urlDatabase[id] = req.body.longURL;
  console.log(urlDatabase)
  res.redirect(`/urls/${id}`);
});

//Creates new form
app.get('/urls/new', (req, res) => {
  const templateVars = { username: req.cookies["username"] };
  res.render('urls_new', templateVars);
});

app.get('/urls/:id', (req, res) => {
  const templateVars = { username: req.cookies["username"], id: req.params.id, longURL: urlDatabase[req.params.id] };
  res.render('urls_show', templateVars);
});

app.get("/u/:id", (req, res) => {
  const longURL = urlDatabase[req.params.id];
  res.redirect(longURL);
});

app.post("/urls/:id/rewrite", (req, res) => {
  const id = req.params.id;
  const newURL = req.body.newID;
  urlDatabase[id] = newURL;
  res.redirect(`/urls/${id}`);
});

app.get('/register' , (req, res) => {
  let templateVars = {
    'urls' : urlDatabase,
    username: usersDatabase
   };
  res.render('urls_registration', templateVars);
});

//Handles Login request
app.get('/login', (req, res) => {
  res.cookie('username', req.body.username);
  res.redirect('/urls');
});

//Handles Logout request
app.post('/logout', (req, res) => {
  res.clearCookie('username');
  res.redirect('/urls');
});

//Delete
app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  const templateVars = { urls: urlDatabase };
  res.render("urls_index", templateVars);
});

//Listener
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});