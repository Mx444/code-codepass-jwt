const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
dotenv.config();

// const saltKey1 = 14;
// const saltKey2 = 12;

// const key1 = bcrypt.hash(process.env.SESSION_KEY1, saltKey1);
// const key2 = bcrypt.hash(process.env.SESSION_KEY2, saltKey2);

module.exports = {
  cookie: { key1: process.env.SESSION_KEY1, key2: process.env.SESSION_KEY2 },
};
