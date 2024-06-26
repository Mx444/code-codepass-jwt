"use strict";

const { createPool } = require("mysql2/promise");
const config = require("../config/config");
const ErrorHandler = require("../utils/errorHandler");

class ConnectionManager {
  #pool;

  constructor() {
    this.#pool = createPool({
      host: config.db.host,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: config.db.waitForConnections,
      connectionLimit: config.db.connectionLimit,
      queueLimit: config.db.queueLimit,
    });
  }

  async getConnection() {
    try {
      return await this.#pool.getConnection();
    } catch (error) {
      ErrorHandler.handle("Error getting connection:", error);
    }
  }

  async closePool() {
    if (this.#pool) {
      try {
        await this.#pool.end();
      } catch (error) {
        ErrorHandler.handle("Error closing connection pool:", error);
      }
    }
  }
}

module.exports = ConnectionManager;
