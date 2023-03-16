const express = require('express');
const dbConnection = require('../database');
const { body, validationResult } = require('express-validator');
const middlewareAuth = require("../middlewares/middlewareAuth");
const router = express.Router();
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const path = require('path')
const app = express();

const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});
function fileNotEmpty(req, file, cb) {
    if (!file.originalname) {
        return cb(null, false);
    }
    cb(null, true);
}

const upload = multer({
    storage: storage,
    fileFilter: fileNotEmpty
});

app.use(bodyParser.urlencoded({ extended: true }));

app.use(fileUpload());

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
            connection.query('SELECT * FROM buildings'),
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
        console.log('Error occurred while fetching data:', error);
        // Send an error response
        res.status(500).send('Failed to fetch data!');
    }
})

router.post('/add', upload.single('image'), async (req, res) => {
    let connection;
    try {
        const validation_result = validationResult(req);
        if (validation_result.isEmpty()) {
            const date = new Date();
            const dateStr =
                date.getFullYear() + "-" +
                ("00" + (date.getMonth() + 1)).slice(-2) + "-" +
                ("00" + date.getDate()).slice(-2) + " " +
                ("00" + date.getHours()).slice(-2) + ":" +
                ("00" + date.getMinutes()).slice(-2) + ":" +
                ("00" + date.getSeconds()).slice(-2);
            connection = await dbConnection.getConnection();
            await connection.beginTransaction();
            const file = req.file;
            // console.log(file.filename);
            const [result] = await connection.query('INSERT INTO repairs(user_id,room_id,building_id,equipment_id,datetime_repair,status,other,details,created_at,img) VALUES(?,?,?,?,?,?,?,?,?,?)', [req.session.userID, req.body.rooms, req.body.buildings, req.body.equipments, req.body.datetime_repair, 1, req.body.other, req.body.details, dateStr, file.filename]);
            const repairsId = result.insertId;
            await connection.query('INSERT INTO repairmans(repair_id,created_at) VALUES(?,?)', [repairsId, dateStr]);
            await connection.commit();
            console.log('Transaction committed successfully!');
            res.redirect('/repair');
        } else {
            let allErrors = validation_result.errors.map((error) => {
                return error.msg;
            });
            // REDERING login-register PAGE WITH LOGIN VALIDATION ERRORS
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

router.get('/edit/(:id)', middlewareAuth.ifNotLoggedin, async (req, res, next) => {
    let id = req.params.id;
    let connection;
    try {
        // Get a connection from the dbConnection
        connection = await dbConnection.getConnection();
        // Execute the SQL queries asynchronously
        const [equipments, buildings, rooms, users, repairs] = await Promise.all([
            connection.query('SELECT * FROM equipments'),
            connection.query('SELECT * FROM buildings'),
            connection.query('SELECT * FROM rooms'),
            connection.query('SELECT * FROM users WHERE id=?', [req.session.userID]),
            connection.query('SELECT * FROM users JOIN repairs ON users.id=repairs.user_id LEFT JOIN repairmans ON repairmans.repair_id = repairs.id LEFT JOIN technicians ON technicians.id = repairmans.technician_id JOIN equipments ON equipments.id = repairs.equipment_id JOIN rooms ON rooms.id = repairs.room_id JOIN buildings ON buildings.id = rooms.building_id WHERE users.id=? AND repairs.id=?', [req.session.userID, id])
        ]);
        // Send the result as response
        console.log(repairs[0]);
        res.render('repair/edit', {
            equipments: equipments[0],
            buildings: buildings[0],
            rooms: rooms[0],
            name: users[0],
            repairs: repairs[0]
        })
    } catch (error) {
        console.log('Error occurred while fetching data:', error);
        // Send an error response
        res.status(500).send('Failed to fetch data!');
    }

})

router.post('/update/:id', upload.single('image'), async (req, res) => {
    let id = req.params.id;
    let connection;
    try {
        const validation_result = validationResult(req);
        if (validation_result.isEmpty()) {
            const date = new Date();
            const dateStr =
                date.getFullYear() + "-" +
                ("00" + (date.getMonth() + 1)).slice(-2) + "-" +
                ("00" + date.getDate()).slice(-2) + " " +
                ("00" + date.getHours()).slice(-2) + ":" +
                ("00" + date.getMinutes()).slice(-2) + ":" +
                ("00" + date.getSeconds()).slice(-2);
            connection = await dbConnection.getConnection();
            await connection.beginTransaction();
            const file = req.file;
            // Check if the file is empty
            if (file) {
                const file = req.file;
                await connection.query('UPDATE repairs SET room_id=?, building_id=? ,equipment_id=? ,datetime_repair=?,other=?,details=?,update_at=?,img=? WHERE id=?', [req.body.rooms, req.body.buildings, req.body.equipments, req.body.datetime_repair, req.body.other, req.body.details, dateStr,file.filename, id]);
                await connection.commit();
                console.log('Transaction committed successfully!');
                res.redirect('/repair/edit/' + id);
            } else {
                await connection.query('UPDATE repairs SET room_id=?, building_id=? ,equipment_id=? ,datetime_repair=?,other=?,details=?,update_at=? WHERE id=?', [req.body.rooms, req.body.buildings, req.body.equipments, req.body.datetime_repair, req.body.other, req.body.details, dateStr, id]);
                await connection.commit();
                console.log('Transaction committed successfully!');
                res.redirect('/repair/edit/' + id);
            }

        } else {
            let allErrors = validation_result.errors.map((error) => {
                return error.msg;
            });
            // REDERING login-register PAGE WITH LOGIN VALIDATION ERRORS
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