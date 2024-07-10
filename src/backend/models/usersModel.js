"use strict";

const Database = require("../db/database.js");
const Transaction = require("../db/transactionManager.js");
const RefreshToken = require("../token/refreshToken.js");
const AccessToken = require("../token/accessToken.js");
const bcrypt = require("bcrypt");
const envBcrypt = require("../config/bcrypt.js");
const validator = require("validator");
const ErrorHandler = require("../utils/errorHandler.js");

class User {
  #databaseIstance;
  #transactionIstance;
  #refreshtToken;
  #accessToken;
  constructor() {
    this.#databaseIstance = new Database();
    this.#transactionIstance = new Transaction();
    this.#refreshtToken = new RefreshToken(this.#databaseIstance, this.#transactionIstance);
    this.#accessToken = new AccessToken();
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
    } catch (error) {
      await this.#transactionIstance.rollback();
      ErrorHandler.handle("Error during SIGNUP operation:", error);
    }
  }

  async loginUsernamePassword(username, password) {
    try {
      this.#transactionIstance.beginTransaction();
      const user = await this.#findByUsername(username);
      await this.#matchPassword(password, user.password_hash);
      const temporanyAccessToken = await this.#accessToken.generateAccessToken(user.id);
      this.#transactionIstance.commit();
      return { userId: user.id, temporanyAccessToken };
    } catch (error) {
      this.#transactionIstance.rollback();
      ErrorHandler.handle("Error during LOGIN USERNAME PASSWORD operation:", error);
    }
  }

  async loginMaster(temporanyAccessToken, master) {
    try {
      await this.#transactionIstance.beginTransaction();

      const verifyAccessToken = await this.#accessToken.verifyAccessToken(temporanyAccessToken);

      if (!!verifyAccessToken) {
        const masterTable = "masterpassword";
        const masterCondition = { user_id: verifyAccessToken.userId };
        const verifyMaster = await this.#databaseIstance.read(masterTable, masterCondition);
        const { master_password_hash: currentMaster, user_id: currentId } = verifyMaster[0];
        await this.#matchPassword(master, currentMaster);

        const tokenTable = "tokens";
        const tokenCondition = { user_id: currentId };
        const verifyActiveRefresh = await this.#databaseIstance.read(tokenTable, tokenCondition);

        if (verifyActiveRefresh.length > 0) {
          const { token: refreshToken } = verifyActiveRefresh[0];
          const newAccessToken = await this.#accessToken.generateAccessToken(currentId);
          return { accessToken: newAccessToken, refreshToken };
        }

        const newAccessToken = await this.#accessToken.generateAccessToken(currentId);
        const refreshToken = await this.#refreshtToken.generateAndStoreRefreshToken(currentId);

        await this.#transactionIstance.commit();
        return { accessToken: newAccessToken, refreshToken };
      } else {
        throw new Error("Invalid or expired temporary access token");
      }
    } catch (error) {
      await this.#transactionIstance.rollback();
      ErrorHandler.handle("Error during LOGIN MASTER operation:", error);
    }
  }

  async logout(accessToken) {
    try {
      await this.#transactionIstance.beginTransaction();

      const verifyAccessToken = await this.#accessToken.verifyAccessToken(accessToken);
      if (!verifyAccessToken) {
        throw new Error("Invalid Token!");
      }

      const tokenTable = "tokens";
      const tokenCondition = { user_id: verifyAccessToken.userId };
      const matchUserId = await this.#databaseIstance.read(tokenTable, tokenCondition);
      if (!matchUserId) {
        throw new Error("ID not Found!");
      }

      const { user_id: currentId } = matchUserId[0];
      const removeCondition = { user_id: currentId };
      await this.#databaseIstance.remove(tokenTable, removeCondition);

      await this.#transactionIstance.commit();
    } catch (error) {
      await this.#transactionIstance.rollback();
      ErrorHandler.handle("Error during LOGOUT operation:", error);
    }
  }

  async updateUser(accessToken, type, newValue) {
    try {
      await this.#transactionIstance.beginTransaction();

      const verifyAccessToken = await this.#accessToken.verifyAccessToken(accessToken);
      if (!verifyAccessToken) {
        throw new Error("Invalid Token!");
      }

      const { id, username: currentUsername, password_hash } = await this.#findUserById(verifyAccessToken.userId);

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
      await this.#transactionIstance.commit();
      return updatedUser;
    } catch (error) {
      await this.#transactionIstance.rollback();
      ErrorHandler.handle(`Error during UPDATEUSER operation for ${type}:`, error);
      throw new Error(`Failed to update user for ${type}`);
    }
  }

  async removeUser(accessToken, password, master) {
    try {
      await this.#transactionIstance.beginTransaction();
      const verifyAccessToken = await this.#accessToken.verifyAccessToken(accessToken);

      if (!verifyAccessToken) {
        throw new Error("Invalid Token !");
      }

      const user = await this.#findUserById(verifyAccessToken.userId);
      const { id: currentId, password_hash } = user;

      await this.#matchPassword(password, password_hash);

      const { master_password_hash } = await this.#findByMaster(currentId);
      const compareMaster = await bcrypt.compare(master, master_password_hash);

      if (!compareMaster) {
        throw new Error("Master password incorrect");
      }

      if (user && compareMaster) {
        const userTable = "users";
        const userCondition = { id: currentId };
        await this.#databaseIstance.remove(userTable, userCondition);
        await this.#transactionIstance.commit();
      }
    } catch (error) {
      await this.#transactionIstance.rollback();
      ErrorHandler.handle("Error during REMOVEUSER operation:", error);
      throw new Error("Failed to remove user");
    }
  }

  async #findByUsername(username) {
    const table = "users";
    const condition = { username: username };
    const findUser = await this.#databaseIstance.read(table, condition);

    if (findUser.length === 0) {
      throw new Error("User not found");
    }

    const user = findUser[0];
    return user;
  }

  async #findUserById(id) {
    const table = "users";
    const condition = { id: id };
    const findUser = await this.#databaseIstance.read(table, condition);

    if (findUser.length === 0) {
      throw new Error("User not found");
    }

    const user = findUser[0];
    return user;
  }

  async #findByMaster(id) {
    const table = "masterpassword";
    const condition = { user_id: id };
    const findCredentials = await this.#databaseIstance.read(table, condition);

    if (findCredentials.length === 0) {
      throw new Error("Credentials not found");
    }

    const userCredentials = findCredentials[0];
    return userCredentials;
  }

  async #matchPassword(string, hash) {
    const matchPassword = await bcrypt.compare(string, hash);

    if (!matchPassword) {
      throw new Error(`Incorrect password`);
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
