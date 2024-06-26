"use strict";

const jwt = require("jsonwebtoken");
const envToken = require("../config/token");
const ErrorHandler = require("../utils/errorHandler");

class TokenModel {
  #databaseIstance;
  #transactionIstance;
  constructor(database, transaction) {
    this.#databaseIstance = database;
    this.#transactionIstance = transaction;
  }

  async generateAndStoreToken(user) {
    try {
      const tokenPayload = {
        userId: user.id,
        username: user.username,
        email: user.email,
      };
      const token = jwt.sign(tokenPayload, envToken.token.key, { expiresIn: "1h" });

      await this.#transactionIstance.beginTransaction();
      const expires_at = new Date(Date.now() + 3600 * 1000);
      const tableToken = "tokens";
      const dataToken = { user_id: user.id, token: token, expires_at: expires_at };
      await this.#databaseIstance.create(tableToken, dataToken);
      this.#transactionIstance.commit();

      return token;
    } catch (error) {
      await this.#transactionIstance.rollback();
      ErrorHandler.handle("Error during GENERATE TOKEN operation:", error);
    }
  }

  async findActiveTokens(user) {
    try {
      await this.#transactionIstance.beginTransaction();
      const tableToken = "tokens";
      const conditionToken = { user_id: user.id };
      const tokenFound = await this.#databaseIstance.read(tableToken, conditionToken);

      if (tokenFound.length > 0) {
        const { token: currentToken } = tokenFound[0];
        this.#transactionIstance.commit();
        return currentToken;
      }
      this.#transactionIstance.commit();
    } catch (error) {
      await this.#transactionIstance.rollback();
      ErrorHandler.handle("Error during FIND TOKEN operation:", error);
    }
  }
}

module.exports = TokenModel;
