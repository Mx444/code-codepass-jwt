const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  cookie: { key1: process.env.SESSION_KEY1, key2: process.env.SESSION_KEY2 },
};
