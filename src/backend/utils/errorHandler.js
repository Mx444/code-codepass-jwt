"use strict";

const logger = require("./logger");

class ErrorHandler {
  static handle(text, error) {
    const errorMessage = error.message || "Unknown error";
    const errorDetails = error.stack || "Error details not available";
    logger.error(`${text} ${errorMessage}`, { details: errorDetails });
    throw error;
  }
}

module.exports = ErrorHandler;
