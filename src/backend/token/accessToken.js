"use strict";

const jwt = require("jsonwebtoken");
const envToken = require("../config/token");
const ErrorHandler = require("../utils/errorHandler");

class TokenModel {
  constructor() {}

  async generateAccessToken(userId) {
    try {
      const tokenPayload = {
        userId: userId,
      };
      const accesToken = jwt.sign(tokenPayload, envToken.token.key, { expiresIn: "15m" });
      return accesToken;
    } catch (error) {
      ErrorHandler.handle("Error during GENERATE ACCESS TOKEN operation:", error);
    }
  }

  async verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, envToken.token.key);
      return decoded;
    } catch (error) {
      return null;
    }
  }
}

module.exports = TokenModel;
