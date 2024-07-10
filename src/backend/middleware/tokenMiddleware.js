"use strict";
const RefreshToken = require("../token/refreshToken.js");
const AccessToken = require("../token/accessToken.js");
const Database = require("../db/database.js");
const Transaction = require("../db/transactionManager.js");

const access = new AccessToken();
const refresh = new RefreshToken(new Database(), new Transaction());

exports.authenticateAndGenerateAccessToken = async (req, res) => {
  const accessToken = req.cookies.accessToken;

  if (!!accessToken) {
    return res.status(200).json({ accessToken: accessToken });
  } else {
    try {
      const refreshToken = req.cookies.refreshToken;
      const validateRefreshToken = await refresh.verifyRefreshToken(refreshToken);

      if (!validateRefreshToken) {
        throw new Error("Invalid refresh token");
      }

      const newAccessToken = await access.generateAccessToken(validateRefreshToken.userId);

      res.cookie("accessToken", newAccessToken, {
        maxAge: 15 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
      });

      res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
      return res.status(500).json({ error: "Failed to authenticate and generate token" });
    }
  }
};
