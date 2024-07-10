"use strict";

const UserModel = require("../models/usersModel.js");
const AccessToken = require("../token/accessToken.js");

const app = new UserModel();
const token = new AccessToken();

exports.signup = async (req, res) => {
  const { username, email, password, master } = req.body;

  try {
    await app.signup(username, email, password, master);
    req.session.isAuthenticated = false;
    res.status(200).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message || "Signup failed" });
  }
};

exports.loginInit = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await app.loginUsernamePassword(username, password);
    const temporaryAccessToken = await token.generateAccessToken(user.userId);

    req.session.isAuthenticated = true;
    req.session.user = user.userId;

    res.cookie("temporaryAccessToken", temporaryAccessToken, {
      maxAge: 5 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
    });

    res.status(200).json({ message: "Username and password verified. Proceed with master password." });
  } catch (error) {
    res.status(400).json({ error: error.message || "Login failed" });
  }
};

exports.loginComplete = async (req, res) => {
  const { masterPassword } = req.body;
  const temporaryAccessToken = req.cookies.temporaryAccessToken;

  try {
    const loginMasterAndGenerate = await app.loginMaster(temporaryAccessToken, masterPassword);

    res.cookie("refreshToken", loginMasterAndGenerate.refreshToken, {
      maxAge: 3 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
    });

    res.cookie("accessToken", loginMasterAndGenerate.accessToken, {
      maxAge: 15 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
    });

    res.clearCookie("temporaryAccessToken");
    res.status(200).json({ message: "Master password verified. Login successful." });
  } catch (error) {
    res.status(400).json({ error: error.message || "Master password verification failed" });
  }
};

exports.logout = async (req, res) => {
  const accessToken = req.cookies.accessToken;

  try {
    if (req.session && req.session.user) {
      await app.logout(accessToken);
      req.session = null;
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      res.status(200).json({ message: "Logged out successfully" });
    } else {
      console.warn("No session found to clear.");
      res.status(400).json({ error: "No active session found" });
    }
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ error: "Error during logout" });
  }
};

exports.session = (req, res) => {
  try {
    if (req.session && req.session.user) {
      res.status(200).json({
        isAuthenticated: req.session.isAuthenticated,
        user: req.session.user,
      });
    } else {
      res.status(200).json({ isAuthenticated: false });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to check session" });
  }
};
