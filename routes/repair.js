const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const dbConnection = require('../database');
const { body, validationResult } = require('express-validator');
const middlewareAuth = require("../middlewares/middlewareAuth");
const router = express.Router();

router.get('/', middlewareAuth.ifNotLoggedin,middlewareAuth.checkAdmin, (req, res, next) => {
    dbConnection.execute('SELECT * FROM users INNER JOIN repair ON users.id=repair.user_id ORDER BY repair_id asc')
        .then(([rows]) => {
            console.log("page repair")
            res.render('repair', {
                name: req.session.userName,
                data: rows
            });
        });
});

module.exports = router;