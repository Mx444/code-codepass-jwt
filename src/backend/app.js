const users = require("./models/usersModel");
const app = new users();

// app.signup("luciaverdi", "luciaverdi@gmail.com", "Password1234@!", "Masterpass1234@!");
app.loginUsernamePassword("mariorossi10", "Password1234@!");
