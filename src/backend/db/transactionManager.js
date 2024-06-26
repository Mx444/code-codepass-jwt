"use strict";

const ConnectionManager = require("../db/connectionManager");
const ErrorHandler = require("../utils/errorHandler");

class TransactionManager {
  constructor() {
    this.connectionManager = new ConnectionManager();
  }

  async beginTransaction() {
    try {
      this.connection = await this.connectionManager.getConnection();
      await this.connection.beginTransaction();
    } catch (error) {
      ErrorHandler.handle("Error starting transaction:", error);
    }
  }

  async commit() {
    try {
      await this.connection.commit();
      this.connection.release();
    } catch (error) {
      ErrorHandler.handle("Error committing transaction:", error);
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
      ErrorHandler.handle("Error during rollback:", error);
    }
  }
}

module.exports = TransactionManager;
