const users = require("./models/users");
const password = require("./models/vault");
const app = new users();
const vault = new password();

// app.signup("mariorossi10", "mariorossi@gmail.com", "Password1234@!", "Masterpass1234@!");
// app.login("mariorossi", "Password1234@!");

// app.signup("luciaverdi", "luciaverdi@gmail.com", "Password1234@!", "Masterpass1234@!");
// app.login("luciaverdi", "Password1234@!");
// app.updateUser("master", "NEWluciaverdi", "NEWPassword1234@!", "NEWPassword1234@!");
// app.removeUser("NEWluciaverdi", "NEWPassword1234@!", "NEWPassword1234@!");
// vault.storePassword("1", "TestUsername", "Password1234", "google.com");
// app.loginUsernamePassword("mariorossi", "Password1234@!");
// app.loginMaster(1, "Masterpass1234@!");
// app.signup("mariorossi107", "mariorossi107@gmail.com", "Password1234@!", "Masterpass1234@!");
app.loginMaster("7", "Masterpass1234@!");
