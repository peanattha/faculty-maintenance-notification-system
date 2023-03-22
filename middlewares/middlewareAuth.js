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
const checkUser = (req, res, next) => {
    if (req.session.role == 0) {
        return res.redirect('/');
    }
    next();
}
const checkAdmin = (req, res, next) => {
    if (req.session.role == 1) {
        return res.redirect('/repair');
    }
    next();
}

const checkRepairnam = (req, res, next) => {
    if (req.session.role == 2) {
        return res.redirect('/repairman');
    }
    next();
}

module.exports = {
    ifNotLoggedin : ifNotLoggedin,
    ifLoggedin : ifLoggedin,
    checkAdmin : checkAdmin,
    checkUser : checkUser,
    checkRepairnam : checkRepairnam
}