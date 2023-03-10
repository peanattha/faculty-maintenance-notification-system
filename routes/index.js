const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const dbConnection = require('../database');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.urlencoded({ extended: false }));
// SET OUR VIEWS AND VIEW ENGINE
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// APPLY COOKIE SESSION MIDDLEWARE
app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    maxAge: 3600 * 1000 // 1hr
}));

// DECLARING CUSTOM MIDDLEWARE
const ifNotLoggedin = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.render('login-register');
    }
    next();
}
const ifLoggedin = (req, res, next) => {
    if (req.session.isLoggedIn && (req.session.role == 0)) {
        return res.redirect('/home');
    }
    next();
}
const checkAdmin = (req, res, next) => {
    if (req.session.role != 1) {
        return res.redirect('/');
    }
    next();
}
const checkAdmin2 = (req, res, next) => {
    if (req.session.role == 1) {
        return res.redirect('/repair');
    }
    next();
}
// END OF CUSTOM MIDDLEWARE
// ROOT PAGE
app.get('/', ifNotLoggedin,checkAdmin2, (req, res, next) => {
    dbConnection.execute("SELECT * FROM users INNER JOIN repair ON users.id=repair.user_id WHERE users.id=?", [req.session.userID])
        .then(([rows]) => {
            console.log(rows);
            res.render('home', {
                data: rows
            });
        });
        

});// END OF ROOT PAGE

app.get('/repair', ifNotLoggedin,checkAdmin, (req, res, next) => {
    dbConnection.execute('SELECT * FROM users INNER JOIN repair ON users.id=repair.user_id ORDER BY repair_id asc')
        .then(([rows]) => {
            res.render('repair', {
                name: req.session.userName,
                data: rows
            });
        });
});

// REGISTER PAGE
app.post('/register', ifLoggedin,
    // post data validation(using express-validator)
    [
        body('user_email', 'Invalid email address!').isEmail().custom((value) => {
            return dbConnection.execute('SELECT email FROM users WHERE email=?', [value])
                .then(([rows]) => {
                    if (rows.length > 0) {
                        return Promise.reject('This E-mail already in use!');
                    }
                    return true;
                });
        }),
        body('user_name', 'Username is Empty!').trim().not().isEmpty(),
        body('user_pass', 'The password must be of minimum length 6 characters').trim().isLength({ min: 6 }),
    ],// end of post data validation
    (req, res, next) => {

        const validation_result = validationResult(req);
        const { user_name, user_pass, user_email } = req.body;
        // IF validation_result HAS NO ERROR
        if (validation_result.isEmpty()) {
            // password encryption (using bcryptjs)
            bcrypt.hash(user_pass, 12).then((hash_pass) => {
                // INSERTING USER INTO DATABASE
                dbConnection.execute("INSERT INTO users(name,email,password) VALUES(?,?,?)", [user_name, user_email, hash_pass])
                    .then(result => {
                        res.send('<h4>your account has been created successfully, Now you can <a href="/">Login</a></h4>');
                    }).catch(err => {
                        // THROW INSERTING USER ERROR'S
                        if (err) throw err;
                    });
            })
                .catch(err => {
                    // THROW HASING ERROR'S
                    if (err) throw err;
                })
        }
        else {
            // COLLECT ALL THE VALIDATION ERRORS
            let allErrors = validation_result.errors.map((error) => {
                return error.msg;
            });
            // REDERING login-register PAGE WITH VALIDATION ERRORS
            res.render('login-register', {
                register_error: allErrors,
                old_data: req.body
            });
        }
    });


// LOGIN PAGE
app.post('/', ifLoggedin, [
    body('user_email').custom((value) => {
        return dbConnection.execute('SELECT email FROM users WHERE email=?', [value])
            .then(([rows]) => {
                if (rows.length == 1) {
                    return true;
                }
                return Promise.reject('Invalid Email Address!');

            });
    }),
    body('user_pass', 'Password is empty!').trim().not().isEmpty(),
], (req, res) => {
    const validation_result = validationResult(req);
    const { user_pass, user_email } = req.body;
    if (validation_result.isEmpty()) {

        dbConnection.execute("SELECT * FROM users WHERE email=?", [user_email])
            .then(([rows]) => {
                bcrypt.compare(user_pass, rows[0].password).then(compare_result => {
                    if (compare_result === true) {
                        req.session.isLoggedIn = true;
                        req.session.userID = rows[0].id;
                        req.session.userName = rows[0].name;
                        req.session.role = rows[0].role;
                        console.log(req.session)
                        res.redirect('/');
                    }
                    else {
                        res.render('login-register', {
                            login_errors: ['Invalid Password!']
                        });
                    }
                })
                    .catch(err => {
                        if (err) throw err;
                    });


            }).catch(err => {
                if (err) throw err;
            });
    }
    else {
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        // REDERING login-register PAGE WITH LOGIN VALIDATION ERRORS
        res.render('login-register', {
            login_errors: allErrors
        });
    }
});
// END OF LOGIN PAGE

// LOGOUT
app.get('/logout', (req, res) => {
    //session destroy
    req.session = null;
    res.redirect('/');
});
// END OF LOGOUT

app.use('/', (req, res) => {
    res.status(404).send('<h1>404 Page Not Found!</h1>');
});

app.listen(3000, () => console.log("Server is Running..."));