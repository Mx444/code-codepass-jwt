const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  salt: { salt1: process.env.SALT_PASSWORD, salt2: process.env.SALT_MASTER },
};
