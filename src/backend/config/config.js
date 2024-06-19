const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: process.env.DB_WAIT_FOR_CONNECTION,
    connectionLimit: process.env.DB_CONNECTION_LIMIT,
    queueLimit: process.env.DB_QUEUE_LIMIT,
    namedPlaceholders: process.env.DB_NAMED_PLACEHOLDERS,
  },
};
