const express = require('express');
const dbConnection = require('../database');
const { body, validationResult } = require('express-validator');
const middlewareAuth = require("../middlewares/middlewareAuth");
const router = express.Router();
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

router.get('/', middlewareAuth.ifNotLoggedin, middlewareAuth.checkUser, (req, res, next) => {
    dbConnection.execute('SELECT repairs.id AS repair_id,users.id AS user_id,users.*,repairs.*,equipments.*,rooms.*,buildings.* FROM users JOIN repairmans ON users.name=repairmans.repairman_name JOIN repairs ON repairmans.id=repairs.repairman_id JOIN equipments ON equipments.id = repairs.equipment_id JOIN rooms ON rooms.id = repairs.room_id JOIN buildings ON buildings.id = rooms.building_id WHERE repairmans.repairman_name = ? AND repairs.status = 2',[req.session.userName])
        .then(([rows]) => {
            console.log("Show Page Home Repairman ID : "+ req.session.userID)
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
            await connection.query('UPDATE repairs SET status=? WHERE id=?', [3,id]);
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
            await connection.query('UPDATE repairs SET status=? WHERE id=?', [4,id]);
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