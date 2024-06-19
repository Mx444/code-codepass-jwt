"use strict";

const db = require("./database");
const bcrypt = require("bcrypt");
const CryptoJS = require("crypto-js");
const validator = require("validator");
const { v4: uuidv4 } = require("uuid");

class Vault {
  #pool;
  constructor() {
    this.#pool = new db();
  }

  async storeItem(userId, username, password, service) {
    try {
      const key = "prova";
      const encrypt = CryptoJS.AES.encrypt(JSON.stringify(password), key).toString();

      const condition = {
        user_id: userId,
        service_name: service,
        username: username,
        encrypted_password: encrypt,
      };

      const newItem = await this.#pool.create("vault", condition);
      return newItem;
    } catch (error) {
      this.#pool.errorAndLogger("Error during STORE_PASSWORD operation:", error);
      throw error;
    }
  }

  async retriveItem(userId, itemId) {}

  async updateItem(userId, type) {}

  async deleteItem(UserId, itemId) {}

  #decryptPassword(data, key) {
    const bytes = CryptoJS.AES.decrypt(data, key);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  }
}

module.exports = Vault;
