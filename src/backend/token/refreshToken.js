"use strict";
const crypto = require("crypto");
const ErrorHandler = require("../utils/errorHandler");

class TokenModel {
  #databaseIstance;
  #transactionIstance;
  constructor(database, transaction) {
    this.#databaseIstance = database;
    this.#transactionIstance = transaction;
  }

  async generateAndStoreRefreshToken(userId) {
    try {
      const newRefreshToken = crypto.randomBytes(64).toString("hex");

      await this.#transactionIstance.beginTransaction();
      const days = 3;
      const milliseconds = 24 * 60 * 60 * 1000;
      const expires_at = new Date(Date.now() + days * milliseconds);
      const tableToken = "tokens";
      const dataToken = { user_id: userId, token: newRefreshToken, expires_at: expires_at };
      await this.#databaseIstance.create(tableToken, dataToken);
      await this.#transactionIstance.commit();

      return newRefreshToken;
    } catch (error) {
      await this.#transactionIstance.rollback();
      ErrorHandler.handle("Error during GENERATE REFRESH TOKEN operation:", error);
    }
  }

  async verifyRefreshToken(token) {
    try {
      await this.#transactionIstance.beginTransaction();
      const tableToken = "tokens";
      const conditionToken = { token: token };
      const foundToken = await this.#databaseIstance.read(tableToken, conditionToken);

      if (foundToken.length > 0) {
        const { expires_at: expiriesValue, token: currentToken } = foundToken[0];
        const currentDate = new Date(Date.now());

        if (expiriesValue > currentDate) {
          await this.#transactionIstance.commit();
          return currentToken;
        }
      } else {
        await this.#transactionIstance.commit();
        return null;
      }
    } catch (error) {
      await this.#transactionIstance.rollback();
      ErrorHandler.handle("Error during VERIFY REFRESH TOKEN operation:", error);
    }
  }
}

module.exports = TokenModel;
