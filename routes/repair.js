const express = require('express');
const dbConnection = require('../database');
const { body, validationResult } = require('express-validator');
const middlewareAuth = require("../middlewares/middlewareAuth");
const router = express.Router();
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

router.get('/', middlewareAuth.ifNotLoggedin, middlewareAuth.checkAdmin, (req, res, next) => {
    dbConnection.execute('SELECT * FROM users INNER JOIN repairs ON users.id=repairs.user_id JOIN repair_details ON repairs.id = repair_details.repair_id JOIN technicians ON technicians.id = repair_details.technician_id JOIN equipments ON equipments.id = repair_details.equipment_id JOIN rooms ON rooms.id = repairs.room_id JOIN buildings ON buildings.id = rooms.building_id ORDER BY repairs.id asc')
        .then(([rows]) => {
            console.log(rows)
            res.render('repair', {
                name: req.session.userName,
                data: rows
            });
        });
});

// display add book page
router.get('/add', middlewareAuth.ifNotLoggedin, async (req, res, next) => {
    let connection;
    try {
        // Get a connection from the dbConnection
        connection = await dbConnection.getConnection();
        // Execute the SQL queries asynchronously
        const [equipments, buildings, rooms, users] = await Promise.all([
            connection.query('SELECT * FROM equipments'),
            connection.query('SELECT building_name FROM buildings'),
            connection.query('SELECT * FROM rooms'),
            connection.query('SELECT * FROM users WHERE id=?', [req.session.userID])
        ]);
        // Send the result as response
        res.render('repair/add', {
            equipments: equipments[0],
            buildings: buildings[0],
            rooms: rooms[0],
            name: users[0]
        })
    } catch (error) {
        connection.release();
        console.log('Error occurred while fetching data:', error);
        // Send an error response
        res.status(500).send('Failed to fetch data!');
    }
});

router.post('/add', async (req, res) => {
    let connection;
    try {
        const validation_result = validationResult(req);
        if (validation_result.isEmpty()) {
            connection = await dbConnection.getConnection();
            await connection.beginTransaction();
            const equipments = req.body.equipments;
            const [result] = await connection.query('INSERT INTO repairs(user_id,room_id,datetime_repair) VALUES(?,?,?)', [req.session.userID, req.body.rooms, req.body.datetime_repair]);
            const repairsId = result.insertId;
            if (equipments.length == 1) {
                const details = req.body.details;
                await connection.query('INSERT INTO repair_details (repair_id,equipment_id, other,status,details) VALUES(?,?,?,?,?)', [repairsId, equipments, req.body.other, 1, details]);
            } else {
                for (let i = 0; i < equipments.length; i++) {
                    const details = req.body.details;
                    await connection.query('INSERT INTO repair_details (repair_id,equipment_id, other,status,details) VALUES(?,?,?,?,?)', [repairsId, equipments[i], req.body.other, 1, details[i]]);
                }
            }
            await connection.commit();
            console.log('Transaction committed successfully!');
            res.redirect('/repair');
        } else {
            let allErrors = validation_result.errors.map((error) => {
                return error.msg;
            });
            res.render('repair/add', {
                addRepair_errors: allErrors
            });
        }
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.log('Transaction rolled back due to an error:', error);
        res.status(500).send('Transaction failed due to an error!');
    }
});

module.exports = router;