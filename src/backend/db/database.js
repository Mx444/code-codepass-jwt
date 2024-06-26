"use strict";

const ConnectionManager = require("./connectionManager");
const ErrorHandler = require("../utils/errorHandler");

class Database {
  constructor() {
    this.connectionManager = new ConnectionManager();
  }

  async #query(sql, values) {
    let connection;
    try {
      connection = await this.connectionManager.getConnection();
      const [result] = await connection.query(sql, values);
      return result;
    } catch (error) {
      ErrorHandler.handle("Error executing query:", error);
    } finally {
      if (connection) connection.release();
    }
  }

  async create(table, data) {
    try {
      this.#validateTable(table);
      const keys = Object.keys(data).join(", ");
      const placeholders = Object.keys(data)
        .map(() => "?")
        .join(", ");
      const values = Object.values(data);
      const sql = `INSERT INTO ${table} (${keys}) VALUES (${placeholders})`;
      return await this.#query(sql, values);
    } catch (error) {
      ErrorHandler.handle("Error executing INSERT query:", error);
    }
  }

  async read(table, condition) {
    try {
      this.#validateTable(table);
      const keys = Object.keys(condition);
      const values = Object.values(condition);
      const placeholders = keys.map((key) => `${key} = ?`).join(" AND ");
      const sql = `SELECT * FROM ${table} WHERE ${placeholders}`;
      return await this.#query(sql, values);
    } catch (error) {
      ErrorHandler.handle("Error executing READ query:", error);
    }
  }

  async update(table, newData, condition) {
    try {
      this.#validateTable(table);
      const newKeys = Object.keys(newData);
      const newValues = Object.values(newData);
      const conditionKeys = Object.keys(condition);
      const conditionValues = Object.values(condition);
      const updatedPlaceholders = newKeys.map((key) => `${key} = ?`).join(", ");
      const conditionPlaceholders = conditionKeys.map((key) => `${key} = ?`).join(" AND ");
      const sql = `UPDATE ${table} SET ${updatedPlaceholders} WHERE ${conditionPlaceholders}`;
      const values = [...newValues, ...conditionValues];
      return await this.#query(sql, values);
    } catch (error) {
      ErrorHandler.handle("Error executing UPDATE query:", error);
    }
  }

  async remove(table, condition) {
    try {
      this.#validateTable(table);
      const conditionKeys = Object.keys(condition);
      const values = Object.values(condition);
      const conditionPlaceholders = conditionKeys.map((key) => `${key} = ?`).join(" AND ");
      const sql = `DELETE FROM ${table} WHERE ${conditionPlaceholders}`;
      return await this.#query(sql, values);
    } catch (error) {
      ErrorHandler.handle("Error executing DELETE query:", error);
    }
  }

  #validateTable(table) {
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      throw new Error("Invalid table name.");
    }
  }
}

module.exports = Database;
