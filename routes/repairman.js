const express = require('express');
const dbConnection = require('../database');
const { body, validationResult } = require('express-validator');
const middlewareAuth = require("../middlewares/middlewareAuth");
const router = express.Router();
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

router.get('/', middlewareAuth.ifNotLoggedin, middlewareAuth.checkUser, (req, res, next) => {
    dbConnection.execute(
        'SELECT * FROM users JOIN repairs ON users.user_id=repairs.user_id JOIN equipments ON equipments.equipment_id = repairs.equipment_id JOIN rooms ON rooms.room_id = repairs.room_id JOIN buildings ON buildings.building_id = rooms.building_id JOIN repairmans ON repairmans.repairman_id=repairs.repairman_id WHERE repairmans.repairman_name = ? ',
        [req.session.userName])
        .then(([rows]) => {
            console.log("Show Page Home Repairman ID : "+ req.session.userID)
            console.log(rows);
            res.render('repairman', {
                name: req.session.userName,
                data: rows
            });
        });
});

router.post('/repairsuccess/:id', async (req, res) => {
    let id = req.params.id;
    let connection;
    try {
        const validation_result = validationResult(req);
        if (validation_result.isEmpty()) {
            connection = await dbConnection.getConnection();
            await connection.beginTransaction();
            await connection.query('UPDATE repairs SET status=? WHERE repair_id=?', [3,id]);
            await connection.commit();
            console.log('Update status "repair success" successfully!');
            res.redirect('/repairman');
        } else {
            let allErrors = validation_result.errors.map((error) => {
                return error.msg;
            });
            res.render('repair/add', {
                editRepair_errors: allErrors
            });
        }
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.log('Transaction rolled back due to an error:', error);
        res.status(500).send('Transaction failed due to an error!');
    } finally {
        connection.release();
    }
});

router.post('/confirmrepairsuccess/:id', async (req, res) => {
    let id = req.params.id;
    let connection;
    try {
        const validation_result = validationResult(req);
        if (validation_result.isEmpty()) {
            connection = await dbConnection.getConnection();
            await connection.beginTransaction();
            await connection.query('UPDATE repairs SET status=? WHERE repair_id=?', [4,id]);
            await connection.commit();
            console.log('Update status "confirm repair success" successfully!');
            res.redirect('/repair');
        } else {
            let allErrors = validation_result.errors.map((error) => {
                return error.msg;
            });
            res.render('repair/add', {
                editRepair_errors: allErrors
            });
        }
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.log('Transaction rolled back due to an error:', error);
        res.status(500).send('Transaction failed due to an error!');
    } finally {
        connection.release();
    }
});

module.exports = router;