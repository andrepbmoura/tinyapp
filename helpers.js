const randomGenString = () => Math.random().toString(36).slice(2).substring(0, 6);

const getUserByEmail = (email, userDatabase) => {
  for (let userId in userDatabase) {
    if (userDatabase[userId].email === email) {
      return userDatabase[userId];
    }
  }
  return null;
};

const urlsUser = (id, urlDatabase) => {
  const database = {};
  for (const url in urlDatabase) {
    if (urlDatabase[url].userId === id) {
      database[url] = urlDatabase[url];
    }
  }
  return database;
};

module.exports = { randomGenString, getUserByEmail, urlsUser };    