const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  token: { key: process.env.SECRET_KEY },
};
