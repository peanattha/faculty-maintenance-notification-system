const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const dbConnection = require('../database');
const { body, validationResult } = require('express-validator');
const middlewareAuth = require("../middlewares/middlewareAuth");
const repairRoute = require("../routes/repair");
const repairmanRoute = require("../routes/repairman");
const methodOverride = require('method-override')
const app = express();

app.use(methodOverride('_method'))

app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: false }));

// SET VIEWS AND VIEW ENGINE
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// APPLY COOKIE SESSION
app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    maxAge: 3600 * 1000 // 1hr
}));

app.use('/repair', repairRoute);
app.use('/repairman', repairmanRoute);

//PAGE USER
app.get('/', middlewareAuth.ifNotLoggedin,middlewareAuth.checkAdmin, middlewareAuth.checkRepairnam, (req, res, next) => {
    dbConnection.execute(
        "SELECT * FROM users "+
        "JOIN repairs ON users.user_id=repairs.user_id "+
        "JOIN equipments ON equipments.equipment_id = repairs.equipment_id "+
        "JOIN rooms ON rooms.room_id = repairs.room_id "+
        "JOIN buildings ON buildings.building_id = rooms.building_id "+
        "WHERE users.user_id=? AND repairs.delete_at IS NULL ORDER BY repairs.repair_id asc", [req.session.userID])
        .then(([rows]) => {
            console.log("Show Page Home User ID : "+ req.session.userID)
            res.render('home', {
                data: rows,
                name: req.session.userName
            });
        });
});

// REGISTER
app.post('/register', middlewareAuth.ifLoggedin,
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
    ],
    (req, res, next) => {

        const validation_result = validationResult(req);
        const { user_name, user_pass, user_email } = req.body;
        if (validation_result.isEmpty()) {
            bcrypt.hash(user_pass, 12).then((hash_pass) => {
                dbConnection.execute("INSERT INTO users(name,email,password) VALUES(?,?,?)", [user_name, user_email, hash_pass])
                    .then(result => {
                        res.send('<script>alert("บัญชีของคุณถูกสร้างขึ้นเรียบร้อยแล้ว ตอนนี้คุณสามารถเข้าสู่ระบบได้แล้ว"); window.location.href = "/"; </script>');
                    }).catch(err => {
                        if (err) throw err;
                    });
            })
                .catch(err => {
                    if (err) throw err;
                })
        }
        else {
            let allErrors = validation_result.errors.map((error) => {
                return error.msg;
            });
            res.render('login-register', {
                register_error: allErrors,
                old_data: req.body
            });
        }
    });

// LOGIN
app.post('/', middlewareAuth.ifLoggedin, [
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
                        req.session.userID = rows[0].user_id;
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

// LOGOUT
app.get('/logout', (req, res) => {
    //session destroy
    req.session = null;
    console.log("Logout");
    res.redirect('/');
});

app.use('/', (req, res) => {
    res.status(404).send('<h1>404 Page Not Found!</h1>');
});

app.listen(3000, () => console.log("Server is Running..."));