"use strict";

const express = require("express");
const User = require("../models/users");
const vault = require("../models/vault");
const { body, validationResult } = require("express-validator");

const router = express.Router();
const user = new User();
const password = new vault();

router.post("/signup", async (req, res) => {
  const { username, email, password, master } = req.body;

  try {
    const userSignup = await user.signup(username, email, password, master);

    req.session.isAuthenticated = true;
    req.session.user = userSignup;

    res.status(200).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message || "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  const { username, password, master } = req.body;

  try {
    let userType;

    if (req.session.isAuthenticated) {
      userType = await user.loginMaster(req.session.user.userId, master);
    } else {
      userType = await user.loginUsernamePassword(username, password);
    }

    req.session.isAuthenticated = true;
    req.session.user = userType;

    res.status(200).json({ message: "User logged in successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message || "Login failed" });
  }
});

router.get("/logout", async (req, res) => {
  try {
    if (req.session) {
      req.session = null;
      res.status(200).json({ message: "Logged out successfully" });
    } else {
      console.warn("No session found to clear.");
      res.status(400).json({ error: "No active session found" });
    }
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ error: "Error during logout" });
  }
});

router.get("/session", (req, res) => {
  try {
    if (req.session && req.session.user) {
      res.status(200).json({ isAuthenticated: req.session.isAuthenticated, user: req.session.user });
    } else {
      res.status(200).json({ isAuthenticated: false });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to check session" });
  }
});

module.exports = router;
