"use strict";

const jwt = require("jsonwebtoken");
const envToken = require("../config/token");

const authenticateToken = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) return res.sendStatus(401);

  jwt.verify(token, envToken.token.key, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
