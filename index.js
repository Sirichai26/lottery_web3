const express = require("express");
const path = require("path");
const cookieSession = require("cookie-session");
const bcrypt = require("bcrypt");
let bodyParser = require('body-parser');
var mysql = require('mysql');
const dbConnection = require("./database");
const {
    body,
    validationResult
} = require("express-validator");

const app = express();
app.use(
    express.urlencoded({
        extended: false,
    })
);

var dbConn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'nodejs_login'
});
// connect to database

dbConn.connect();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// SET OUR VIEWS AND VIEW ENGINE
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// APPLY COOKIE SESSION MIDDLEWARE
app.use(
    cookieSession({
        name: "session",
        keys: ["key1", "key2"],
        maxAge: 3600 * 1000, // 1hr
    })
);

// DECLARING CUSTOM MIDDLEWARE
const ifNotLoggedin = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.render("login-register");
    }
    next();
};
const ifLoggedin = (req, res, next) => {
    if (req.session.isLoggedIn) {
        return res.redirect("/home");
    }
    next();
};
// END OF CUSTOM MIDDLEWARE

// ROOT PAGE
app.get("/", ifNotLoggedin, (req, res, next) => {
    dbConnection
        .execute(
            "SELECT * FROM `loterry` as lt LEFT JOIN `users`as us  ON lt.`id` = us.`id`  WHERE lt.`id`=?",
            [req.session.userID]
        )
        .then(([rows]) => {
            res.render("home", {
                data: rows

            });
        });
}); // END OF ROOT PAGE

// REGISTER PAGE
app.post(
    "/register",
    ifLoggedin,
    // post data validation(using express-validator)
    [
        body("user_email", "Invalid email address!")
            .isEmail()
            .custom((value) => {
                return dbConnection
                    .execute("SELECT `email` FROM `users` WHERE `email`=?", [value])
                    .then(([rows]) => {
                        if (rows.length > 0) {
                            return Promise.reject("This E-mail already in use!");
                        }
                        return true;
                    });
            }),
        body("user_name", "Username is Empty!").trim().not().isEmpty(),
        body("user_pass", "The password must be of minimum length 6 characters")
            .trim()
            .isLength({
                min: 6,
            }),
        // body('user_number','The number must be of maximum length 6 characters').trim().isLength({ max: 6 }),
    ], // end of post data validation
    (req, res, next) => {
        const validation_result = validationResult(req);
        const {
            user_name,
            user_pass,
            user_email
        } = req.body;
        // IF validation_result HAS NO ERROR
        if (validation_result.isEmpty()) {
            // password encryption (using bcryptjs)
            bcrypt
                .hash(user_pass, 12)
                .then((hash_pass) => {
                    // INSERTING USER INTO DATABASE
                    dbConnection
                        .execute(
                            "INSERT INTO `users`(`name`,`email`,`password`) VALUES(?,?,?)",
                            [user_name, user_email, hash_pass]
                        )
                        .then((result) => {
                            res.send(
                                `your account has been created successfully, Now you can <a href="/">Login</a>`
                            );
                        })
                        .catch((err) => {
                            // THROW INSERTING USER ERROR'S
                            if (err) throw err;
                        });
                })
                .catch((err) => {
                    // THROW HASING ERROR'S
                    if (err) throw err;
                });
        } else {
            // COLLECT ALL THE VALIDATION ERRORS
            let allErrors = validation_result.errors.map((error) => {
                return error.msg;
            });
            // REDERING login-register PAGE WITH VALIDATION ERRORS
            res.render("login-register", {
                register_error: allErrors,
                old_data: req.body,
            });
        }
    }
); // END OF REGISTER PAGE

// LOGIN PAGE
app.post(
    "/",
    ifLoggedin,
    [
        body("user_email").custom((value) => {
            return dbConnection
                .execute("SELECT email FROM users WHERE email=?", [value])
                .then(([rows]) => {
                    if (rows.length == 1) {
                        return true;
                    }
                    return Promise.reject("Invalid Email Address!");
                });
        }),
        body("user_pass", "Password is empty!").trim().not().isEmpty(),
    ],
    (req, res) => {
        const validation_result = validationResult(req);
        const {
            user_pass,
            user_email
        } = req.body;
        if (validation_result.isEmpty()) {
            dbConnection
                .execute("SELECT * FROM `users` WHERE `email`=?", [user_email])
                .then(([rows]) => {
                    bcrypt
                        .compare(user_pass, rows[0].password)
                        .then((compare_result) => {
                            if (compare_result === true) {
                                req.session.isLoggedIn = true;
                                req.session.userID = rows[0].id;
                                res.redirect("/");
                            } else {
                                res.render("login-register", {
                                    login_errors: ["Invalid Password!"],
                                });
                            }
                        })
                        .catch((err) => {
                            if (err) throw err;
                        });
                })
                .catch((err) => {
                    if (err) throw err;
                });
        } else {
            let allErrors = validation_result.errors.map((error) => {
                return error.msg;
            });
            // REDERING login-register PAGE WITH LOGIN VALIDATION ERRORS
            res.render("login-register", {
                login_errors: allErrors,
            });
        }
    }
);

// END OF LOGIN PAGE
app.post(
    "/buy",

    // post data validation(using express-validator)
    [
        body("user_number", "Invalid number address!").custom((value) => {
            return dbConnection
                .execute("SELECT `number` FROM `loterry` WHERE `number`=?", [value])
                .then(([rows]) => {
                    if (rows.length > 0) {
                        return Promise.reject("This number already in use!");
                    }
                    return true;
                });
        }),
        body("user_number", "The password must be of minimum length 6 characters")
            .trim()
            .isLength({
                min: 6,
            }),
        body("user_number", "The number must be of maximum length 6 characters")
            .trim()
            .isLength({
                max: 6,
            }),
    ], // end of post data validation
    (req, res, next) => {
        const validation_result = validationResult(req);
        const {
            user_number
        } = req.body;
        // IF validation_result HAS NO ERROR
        if (validation_result.isEmpty()) {

            greetingApp(user_number);
            // password encryption (using bcryptjs)
            dbConnection
                .execute("INSERT INTO `loterry`(`number`,`id`) VALUES(?,?)", [
                    user_number,
                    req.session.userID,
                ])
                .then((result) => {
                    res.send(`Successful lottery purchase <a href="/">back</a>`);
                })
                .catch((err) => {
                    // THROW INSERTING USER ERROR'S

                    if (err) throw err;
                });
        } else {
            res.send(`error  <a href="/">back</a>`);
        }
    }
);
//blockchain
const updateGreeting = (greeting, contract, accounts, input) => {
    contract.methods.updateGreeting(input).send({ from: accounts[0], gas: 40000 });
}
async function greetingApp(input) {
    const Web3 = require("web3");
    const web3 = new Web3("http://127.0.0.1:7545");
    const accounts = await web3.eth.getAccounts();
    const contract = await getContract(web3);
    let greeting;
    updateGreeting(greeting, contract, accounts, input);
}
const getContract = async (web3) => {
    const fs = require('fs');
    let rawdata = fs.readFileSync("./build/contracts/Greeting.json");
    let data  = JSON.parse(rawdata);
    const netId = await web3.eth.net.getId();
    const deployedNetwork = data.networks[netId];
    const greeting = new web3.eth.Contract(data.abi, deployedNetwork && deployedNetwork.address)
    return greeting;
}


//API
app.get('/home/users', function (req, res) {
    dbConn.query('SELECT * FROM users', function (error, results, fields) {
        if (error) throw error;
        return res.send({ error: false, data: results, message: 'users list.' });
    });
});

app.get('/home/users/:id', function (req, res) {
    let user_id = req.params.id;
    if (!user_id) {
        return res.status(400).send({ error: true, message: 'Please provide user_id' });
    }
    dbConn.query('SELECT * FROM `loterry` as lt LEFT JOIN `users`as us  ON lt.`id` = us.`id`  WHERE lt.`id`=?', user_id, function (error, results, fields) {
        if (error) throw error;
        return res.send({ error: false, data: results, message: 'users list.' });
    });
});

app.get('/login/users', function (req, res) {
    const {
        user_email
    } = req.body;
    if (!req.body) {
        return res.status(400).send({ error: true, message: 'Please provide user' });
    }
    dbConn.query("SELECT * FROM `users`  WHERE `email`=?  ", [user_email], function (error, results, fields) {
        if (error) throw error;
        return res.send({ error: false, data: results, message: 'login successfully.' });

    });
});

app.post('/register/user', function (req, res) {
    const {
        user_name,
        user_pass,
        user_email
    } = req.body;
    if (!req.body) {
        return res.status(400).send({ error: true, message: 'Please provide user' });
    }
    dbConn.query("INSERT INTO `users`(`name`,`email`,`password`) VALUES(?,?,?)",
        [user_name, user_email, user_pass], function (error, results, fields) {
            if (error) throw error;
            return res.send({ error: false, data: results, message: 'New user has been created successfully.' });
        });
});

app.post('/buy/lottery', function (req, res) {
    const {
        user_number,
        user_id
    } = req.body;
    if (!req.body) {
        return res.status(400).send({ error: true, message: 'Please provide loterry' });
    }
    dbConn.query("INSERT INTO `loterry`(`number`,`id`) VALUES(?,?)", [
        user_number,
        user_id,], function (error, results, fields) {
            if (error) throw error;
            return res.send({ error: false, data: results, message: 'New loterry has been  successfully.' });
        });
    //blockchain
    const displayGreeting = async (greeting, contract) => {
        greeting = await contract.methods.sayHello().call();
        $("h2").html(greeting);
    }

    const updateGreeting = (greeting, contract, accounts) => {
        let input;
        $("#input").on("change", (e) => {
            input = e.target.value;
            console.log(greeting, contract, accounts)
        });
        $("#form").on("submit", async (e) => {
            e.preventDefault();
            await contract.methods.updateGreeting(input).send({ from: accounts[0], gas: 40000 });
            displayGreeting(greeting, contract);
        })
    }

    async function greetingApp() {
        const web3 = await getWeb3();
        const accounts = await web3.eth.getAccounts();
        const contract = await getContract(web3);
        let greeting;
        displayGreeting(greeting, contract);
        updateGreeting(greeting, contract, accounts);
    }

    greetingApp();
});
// END API

// LOGOUT
app.get("/logout", (req, res) => {
    //session destroy
    req.session = null;
    res.redirect("/");
});
// END OF LOGOUT

// regis
app.get("/regis", (req, res) => {
    res.render("register");
});
// END OF regis
app.use("/", (req, res) => {
    res.status(404).send("<h1>404 Page Not Found!</h1>");
});

app.listen(3000, () => console.log("Server is Running..."));

