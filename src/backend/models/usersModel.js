"use strict";

const Database = require("../db/database.js");
const Transaction = require("../db/transactionManager.js");
const TokenModel = require("./tokenModel.js");
const bcrypt = require("bcrypt");
const envBcrypt = require("../config/bcrypt.js");
const validator = require("validator");
const ErrorHandler = require("../utils/errorHandler.js");

class User {
  #databaseIstance;
  #transactionIstance;
  #token;
  constructor() {
    this.#databaseIstance = new Database();
    this.#transactionIstance = new Transaction();
    this.#token = new TokenModel(this.#databaseIstance, this.#transactionIstance);
  }

  async signup(username, email, password, master) {
    try {
      const error = [];

      if (!validator.isLength(username, { min: 3, max: 15 })) {
        error.push("The username must be between 3 and 15 characters long.");
      }
      const regex = /^[a-zA-Z]+$/;
      if (!regex.test(username)) {
        error.push("The username must contain only letters.");
      }
      if (username !== username.toLowerCase()) {
        error.push("The username must be in lowercase.");
      }
      if (username.includes(" ")) {
        error.push("The username must not contain spaces.");
      }
      const reservedUsernames = ["admin", "user", "superuser", "root"];
      if (reservedUsernames.includes(username.toLowerCase())) {
        error.push("The username you have chosen is reserved or not allowed.");
      }
      if (!validator.isEmail(email)) {
        error.push("The email address is not valid.");
      }
      if (!this.#validatePassword(password, 8)) {
        error.push("The password does not meet complexity requirements.");
      }
      if (!this.#validatePassword(master, 10)) {
        error.push("The master password does not meet complexity requirements.");
      }

      await this.#transactionIstance.beginTransaction();
      const tableUsers = "users";
      const conditionUsername = { username: username };
      const existingUsername = await this.#databaseIstance.read(tableUsers, conditionUsername);
      if (existingUsername.length > 0) {
        error.push("This username is already in use.");
      }

      const conditionEmail = { email: email };
      const existingEmail = await this.#databaseIstance.read(tableUsers, conditionEmail);
      if (existingEmail.length > 0) {
        error.push("This email address is already in use.");
      }

      if (error.length > 0) {
        const errorMessage = error.join(", ");
        throw new Error(errorMessage);
      }

      const passwordHash = await bcrypt.hash(password, parseInt(envBcrypt.salt.salt1));
      const masterdHash = await bcrypt.hash(master, parseInt(envBcrypt.salt.salt2));

      const userData = {
        username: username,
        email: email,
        password_hash: passwordHash,
      };
      const { insertId } = await this.#databaseIstance.create(tableUsers, userData);

      const userMaster = {
        user_id: insertId,
        master_password_hash: masterdHash,
      };
      await this.#databaseIstance.create("masterpassword", userMaster);
      await this.#transactionIstance.commit();

      return { userId: insertId, username: username, email: email };
    } catch (error) {
      await this.#transactionIstance.rollback();
      ErrorHandler.handle("Error during SIGNUP operation:", error);
    }
  }

  async loginUsernamePassword(username, password) {
    try {
      const user = await this.#findByUsername(username);
      await this.#matchPassword(password, user.password_hash);

      const tokenFound = await this.#token.findActiveTokens(user);
      if (!tokenFound) {
        const newToken = await this.#token.generateAndStoreToken(user);
        this.#transactionIstance.commit();
        return newToken;
      }

      this.#transactionIstance.commit();
      return { token: tokenFound };
    } catch (error) {
      await this.#transactionIstance.rollback();
      ErrorHandler.handle("Error during LOGIN USERNAME PASSWORD operation:", error);
    }
  }

  //! DA SISTEMARE
  async loginMaster(id, master) {
    try {
      const masterLogin = await this.#findByMaster(id);
      await this.#matchPassword(master, masterLogin.master_password_hash);

      await this.#transactionIstance.beginTransaction();
      const findUser = await this.#databaseIstance.read("users", { id: id });
      const user = findUser[0];
      await this.#transactionIstance.commit();

      return { userId: masterLogin.user_id, username: user.username, email: user.email };
    } catch (error) {
      await this.#transactionIstance.rollback();
      ErrorHandler.handle("Error during LOGIN MASTER operation:", error);
    }
  }

  async logout() {}

  async updateUser(type, username, password, newValue) {
    try {
      const { id, username: currentUsername, password_hash } = await this.#findByUsername(username);

      const { user_id, master_password_hash } = await this.#findByMaster(id);
      await this.#matchPassword(password, password_hash);

      let table = "";
      let newData = {};
      let condition = {};

      switch (type) {
        case "username":
          this.#validatenewValue(newValue, currentUsername);
          if (!validator.isAlphanumeric(newValue)) {
            throw new Error("The username must be alphanumeric.");
          }
          table = "users";
          newData.username = newValue;
          condition = { id };
          break;

        case "password":
          const comparePassword = await bcrypt.compare(newValue, password_hash);
          if (comparePassword === true) {
            throw new Error(`New ${type} is the same as the current ${type}`);
          }
          if (!this.#validatePassword(newValue, 8)) {
            throw new Error("The password does not meet complexity requirements.");
          }

          const bcrypt_password = await bcrypt.hash(newValue, parseInt(envBcrypt.salt.salt1));
          table = "users";
          newData.password_hash = bcrypt_password;
          condition = { id };
          break;

        case "master":
          const compareMaster = await bcrypt.compare(newValue, master_password_hash);
          if (compareMaster === true) {
            throw new Error(`New ${type} is the same as the current ${type}`);
          }
          if (!this.#validatePassword(newValue, 10)) {
            throw new Error("The master password does not meet complexity requirements.");
          }

          const bcrypt_master = await bcrypt.hash(newValue, parseInt(envBcrypt.salt.salt2));
          table = "masterpassword";
          newData.master_password_hash = bcrypt_master;
          condition = { user_id };
          break;

        default:
          throw new Error("Invalid update type");
      }

      const updatedUser = await this.#databaseIstance.update(table, newData, condition);
      return updatedUser;
    } catch (error) {
      ErrorHandler.handle(`Error during UPDATEUSER operation for ${type}:`, error);
      throw new Error(`Failed to update user for ${type}`);
    }
  }

  async removeUser(username, password, master) {
    try {
      const user = await this.#findByUsername(username);
      const { id, password_hash } = user;

      await this.#matchPassword(password, password_hash);

      const { master_password_hash } = await this.#findByMaster(id);
      const compareMaster = await bcrypt.compare(master, master_password_hash);

      if (!compareMaster) {
        throw new Error("Master password incorrect");
      }

      if (user && compareMaster) {
        const removedUser = await this.#databaseIstance.remove("users", { id: id });
        return removedUser;
      }
    } catch (error) {
      ErrorHandler.handle("Error during REMOVEUSER operation:", error);
      throw new Error("Failed to remove user");
    }
  }

  async #findByUsername(username) {
    try {
      await this.#transactionIstance.beginTransaction();

      const condition = {
        username: username,
      };
      const findUser = await this.#databaseIstance.read("users", condition);

      if (findUser.length === 0) {
        throw new Error("User not found");
      }

      await this.#transactionIstance.commit();

      const user = findUser[0];
      return user;
    } catch (error) {
      await this.#transactionIstance.rollback();
      ErrorHandler.handle("Error during FIND_BY_USERNAME operation:", error);
    }
  }

  async #matchPassword(string, hash) {
    const matchPassword = await bcrypt.compare(string, hash);

    if (!matchPassword) {
      throw new Error(`Incorrect password`);
    }
  }

  async #findByMaster(id) {
    try {
      await this.#transactionIstance.beginTransaction();

      const condition = {
        user_id: id,
      };
      const findCredentials = await this.#databaseIstance.read("masterpassword", condition);

      if (findCredentials.length === 0) {
        throw new Error("Credentials not found");
      }
      await this.#transactionIstance.commit();

      const userCredentials = findCredentials[0];
      return userCredentials;
    } catch (error) {
      await this.#transactionIstance.rollback();
      ErrorHandler.handle("Error during FIND_BY_MASTER operation:", error);
    }
  }

  #validatenewValue(oldParam, newParam) {
    if (oldParam === newParam) {
      throw new Error(`New param is the same as the current param`);
    }
  }

  #validatePassword(string, min) {
    return (
      validator.isLength(string, { min: min }) &&
      validator.matches(string, /[a-zA-Z]/) &&
      validator.matches(string, /[0-9]/) &&
      validator.matches(string, /[!@#$%^&*()\-_=+{};:,<.>]/)
    );
  }
}

module.exports = User;
