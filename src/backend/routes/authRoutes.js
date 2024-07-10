"use strict";

const express = require("express");
const authController = require("../controllers/authController.js");
const authMiddleware = require("../middleware/authMiddleware.js");
const tokenMiddleware = require("../middleware/tokenMiddleware.js");

const router = express.Router();
// Rotte publiche
router.post("/signup", authController.signup);
router.post("/login/init", authController.loginInit);
router.post("/login/complete", authController.loginComplete);

// Rotte protette
router.get("/logout", authMiddleware, authController.logout);

// Rotte da sistemare
router.get("/session", authController.session);

// Test middle
router.get("/protected", authMiddleware, (req, res) => {
  res.json({ message: "This is a protected endpoint", user: req.user });
});
module.exports = router;
