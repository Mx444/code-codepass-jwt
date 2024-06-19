"use strict";

const { createPool, escape } = require("mysql2/promise");
const logger = require("../utils/logger");
const config = require("../config/config");
const dotenv = require("dotenv");
dotenv.config();

class Database {
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
      namedPlaceholders: config.db.namedPlaceholders,
    });
  }

  async #connect() {
    if (!this.#pool) {
      try {
        this.#pool = createPool({
          host: config.db.host,
          user: config.db.user,
          password: config.db.password,
          database: config.db.database,
          waitForConnections: config.db.waitForConnections,
          connectionLimit: config.db.connectionLimit,
          queueLimit: config.db.queueLimit,
          namedPlaceholders: config.db.namedPlaceholders,
        });
      } catch (error) {
        this.errorAndLogger("Error connecting to MySQL:", error);
      }
    }
  }

  async #closePool() {
    if (this.#pool) {
      try {
        await this.#pool.end();
      } catch (error) {
        this.errorAndLogger("Error closing database connection pool:", error);
      }
    }
  }

  async beginTransaction() {
    try {
      this.connection = await this.#pool.getConnection();
      await this.connection.beginTransaction();
    } catch (error) {
      this.errorAndLogger("Error starting transaction:", error);
    }
  }

  async commit() {
    try {
      await this.connection.commit();
      this.connection.release();
    } catch (error) {
      this.errorAndLogger("Error commit:", error);
    }
  }

  async rollback() {
    try {
      if (this.connection) {
        await this.connection.rollback();
        this.connection.release();
      } else {
        throw new Error("No active connection to rollback.");
      }
    } catch (error) {
      this.errorAndLogger("Error during rollback:", error);
    }
  }

  async #query(sql, values) {
    try {
      const [result] = await this.#pool.query(sql, values);

      return result;
    } catch (error) {
      this.errorAndLogger("Error executing query:", error);
    }
  }

  async create(table, data) {
    try {
      this.#validateTable(table);

      const keys = Object.keys(data).join(", ");
      const placeholders = Object.keys(data)
        .map(() => `?`)
        .join(", ");
      const values = Object.values(data);

      let sql = `INSERT INTO ${table} (${keys}) VALUES (${placeholders})`;

      return await this.#query(sql, values);
    } catch (error) {
      this.errorAndLogger("Error executing INSERT query:", error);
    }
  }

  async read(table, condition) {
    try {
      this.#validateTable(table);

      const keys = Object.keys(condition);
      const value = Object.values(condition);
      const placeholders = keys.map((key) => `${key} = ?`).join(" AND ");
      const sql = `SELECT * FROM ${table} WHERE ${placeholders}`;

      return await this.#query(sql, value);
    } catch (error) {
      this.errorAndLogger("Error executing READ query:", error);
    }
  }

  async update(table, newData, condition) {
    try {
      this.#validateTable(table);

      const newKeys = Object.keys(newData);
      const newValues = Object.values(newData);
      const conditionKeys = Object.keys(condition);
      const coditionValues = Object.values(condition);

      const updatedPlaceholder = newKeys.map((key) => `${key} = ?`);
      const conditionPlaceholder = conditionKeys.map((key) => `${key} = ?`).join(" AND ");

      const sql = `UPDATE ${table} SET ${updatedPlaceholder.join(", ")} WHERE ${conditionPlaceholder}`;

      const values = [...newValues, ...coditionValues];

      return await this.#query(sql, values);
    } catch (error) {
      this.errorAndLogger("Error executing UPDATE query:", error);
    }
  }

  async remove(table, condition) {
    try {
      this.#validateTable(table);

      const conditionKeys = Object.keys(condition);
      const values = Object.values(condition);
      const conditionKeysPlaceholder = conditionKeys.map((keys) => `${keys} = ?`).join(" AND ");

      const sql = `DELETE FROM ${table} WHERE ${conditionKeysPlaceholder}`;

      return await this.#query(sql, values);
    } catch (error) {
      this.errorAndLogger("Error executing DELETE query:", error);
    }
  }

  #validateTable(table) {
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      throw new Error("Invalid table name.");
    }
  }
  errorAndLogger(text, error) {
    const errorMessage = error.message || "Unknown error";
    const errorDetails = error.stack || "Error details not available";
    logger.error(`${text} ${errorMessage}`, { details: errorDetails });
    throw error;
  }
}

module.exports = Database;
