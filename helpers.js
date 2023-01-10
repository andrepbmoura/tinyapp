const randomGenString = () => Math.random().toString(36).slice(2).substring(0, 6);

const cookieHasUser = function(cookie, userDatabase) {
  for (const user in userDatabase) {
    if (cookie === user) {
      return true;
    }
  } return false;
};

module.exports = { cookieHasUser, randomGenString }; 