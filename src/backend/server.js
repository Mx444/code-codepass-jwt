const express = require("express");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
const path = require("path");
const cookieSession = require("cookie-session");
const session = require("./config/cookie");
const cookieParser = require("cookie-parser");

require("dotenv").config();
const app = express();

app.use(cookieParser());

app.use(
  cookieSession({
    name: "session",
    keys: [session.cookie.key1, session.cookie.key2],
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
  }),
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "../frontend/")));

app.use("/auth", authRoutes);

const PORT = process.env.PORT || 3300;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
