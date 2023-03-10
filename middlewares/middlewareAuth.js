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

module.exports = {
    ifNotLoggedin : ifNotLoggedin,
    ifLoggedin : ifLoggedin,
    checkAdmin : checkAdmin,
    checkAdmin2 : checkAdmin2
}