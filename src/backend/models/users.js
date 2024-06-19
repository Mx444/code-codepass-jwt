"use strict";
const db = require("./database");
const bcrypt = require("bcrypt");
const validator = require("validator");
const { v4: uuidv4 } = require("uuid");

class User {
  #pool;
  constructor() {
    this.#pool = new db();
  }

  async signup(username, email, password, master) {
    try {
      const error = [];

      if (!validator.isAlphanumeric(username)) {
        error.push("The username must be alphanumeric.");
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

      await this.#pool.beginTransaction();

      const existingUsername = await this.#pool.read("users", { username: username });
      if (existingUsername.length > 0) {
        error.push("This username is already in use.");
      }

      const existingEmail = await this.#pool.read("users", { email: email });
      if (existingEmail.length > 0) {
        error.push("This email address is already in use.");
      }

      if (error.length > 0) {
        const errorMessage = error.join(", ");
        throw new Error(errorMessage);
      }
      const salt = 10;
      const passwordHash = await bcrypt.hash(password, salt);
      const masterdHash = await bcrypt.hash(master, salt);

      const userData = {
        username: username,
        email: email,
        password_hash: passwordHash,
      };

      const { insertId } = await this.#pool.create("users", userData);

      const userMaster = {
        user_id: insertId,
        master_password_hash: masterdHash,
      };

      await this.#pool.create("masterpassword", userMaster);

      await this.#pool.commit();

      return { userId: insertId, username: username, email: email };
    } catch (error) {
      await this.#pool.rollback();
      this.#pool.errorAndLogger("Error during SIGNUP operation:", error);
    }
  }

  async loginUsernamePassword(username, password) {
    try {
      const user = await this.#findByUsername(username);
      await this.#matchPassword(password, user.password_hash);

      return { userId: user.id, username: user.username, email: user.email };
    } catch (error) {
      this.#pool.errorAndLogger("Error during LOGIN USERNAME PASSWORD operation:", error);
    }
  }

  async loginMaster(id, master) {
    try {
      const masterLogin = await this.#findByMaster(id);
      await this.#matchPassword(master, masterLogin.master_password_hash);

      await this.#pool.beginTransaction();
      const findUser = await this.#pool.read("users", { id: id });
      const user = findUser[0];
      await this.#pool.commit();

      return { userId: masterLogin.user_id, username: user.username, email: user.email };
    } catch (error) {
      await this.#pool.rollback();
      this.#pool.errorAndLogger("Error during LOGIN MASTER operation:", error);
      throw error;
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
          const saltPassword = 10;
          const bcrypt_password = await bcrypt.hash(newValue, saltPassword);
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
          const saltMaster = 14;
          const bcrypt_master = await bcrypt.hash(newValue, saltMaster);
          table = "masterpassword";
          newData.master_password_hash = bcrypt_master;
          condition = { user_id };
          break;

        default:
          throw new Error("Invalid update type");
      }

      const updatedUser = await this.#pool.update(table, newData, condition);
      return updatedUser;
    } catch (error) {
      this.#pool.errorAndLogger(`Error during UPDATEUSER operation for ${type}:`, error);
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
        const removedUser = await this.#pool.remove("users", { id: id });
        return removedUser;
      }
    } catch (error) {
      this.#pool.errorAndLogger("Error during REMOVEUSER operation:", error);
      throw new Error("Failed to remove user");
    }
  }

  async #findByUsername(username) {
    try {
      await this.#pool.beginTransaction();

      const condition = {
        username: username,
      };
      const findUser = await this.#pool.read("users", condition);

      if (findUser.length === 0) {
        throw new Error("User not found");
      }

      await this.#pool.commit();

      const user = findUser[0];
      return user;
    } catch (error) {
      await this.#pool.rollback();
      this.#pool.errorAndLogger("Error during FIND_BY_USERNAME operation:", error);
    }
  }

  async #findByMaster(id) {
    try {
      await this.#pool.beginTransaction();

      const condition = {
        user_id: id,
      };
      const findCredentials = await this.#pool.read("masterpassword", condition);

      if (findCredentials.length === 0) {
        throw new Error("Credentials not found");
      }
      await this.#pool.commit();

      const userCredentials = findCredentials[0];
      return userCredentials;
    } catch (error) {
      await this.#pool.rollback();
      this.#pool.errorAndLogger("Error during FIND_BY_MASTER operation:", error);
    }
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
