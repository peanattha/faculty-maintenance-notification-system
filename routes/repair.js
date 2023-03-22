const express = require('express');
const dbConnection = require('../database');
const { body, validationResult } = require('express-validator');
const middlewareAuth = require("../middlewares/middlewareAuth");
const router = express.Router();
const bodyParser = require('body-parser');
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

router.get('/', middlewareAuth.ifNotLoggedin, middlewareAuth.checkAdmin, (req, res, next) => {
    dbConnection.execute('SELECT repairs.id AS repair_id,users.id AS user_id,users.*,repairs.*,equipments.*,rooms.*,buildings.* FROM users JOIN repairs ON users.id=repairs.user_id JOIN equipments ON equipments.id = repairs.equipment_id JOIN rooms ON rooms.id = repairs.room_id JOIN buildings ON buildings.id = rooms.building_id ORDER BY repairs.id asc')
        .then(([rows]) => {
            // console.log(rows)
            res.render('repair', {
                name: req.session.userName,
                data: rows
            });
        });
});

// 
router.get('/add', middlewareAuth.ifNotLoggedin, async (req, res, next) => {
    let connection;
    try {
        connection = await dbConnection.getConnection();
        const [equipments, buildings, rooms, users] = await Promise.all([
            connection.query('SELECT * FROM equipments'),
            connection.query('SELECT * FROM buildings'),
            connection.query('SELECT * FROM rooms'),
            connection.query('SELECT * FROM users WHERE id=?', [req.session.userID])
        ]);
        res.render('repair/add', {
            equipments: equipments[0],
            buildings: buildings[0],
            rooms: rooms[0],
            name: users[0]
        })
    } catch (error) {
        console.log('Error occurred while fetching data:', error);
        res.status(500).send('Failed to fetch data!');
    } finally {
        connection.release();
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
            await connection.query('INSERT INTO repairs(user_id,room_id,building_id,equipment_id,datetime_repair,status,other,details,created_at,img) VALUES(?,?,?,?,?,?,?,?,?,?)', [req.session.userID, req.body.rooms, req.body.buildings, req.body.equipments, req.body.datetime_repair, 1, req.body.other, req.body.details, dateStr, file.filename]);
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
        console.log('Transaction rolled back due to an error:', error);
        res.status(500).send('Transaction failed due to an error!');
    } finally {
        connection.release();
    }
});

router.get('/edit/:id', middlewareAuth.ifNotLoggedin, async (req, res, next) => {
    let id = req.params.id;
    let connection;
    try {
        connection = await dbConnection.getConnection();
        const [equipments, buildings, rooms, repairmans, repairs] = await Promise.all([
            connection.query('SELECT * FROM equipments'),
            connection.query('SELECT * FROM buildings'),
            connection.query('SELECT * FROM rooms'),
            connection.query('SELECT * FROM repairmans'),
            connection.query('SELECT repairs.id AS repair_id,users.id AS user_id,users.*,repairs.*,equipments.*,rooms.*,buildings.* FROM users JOIN repairs ON users.id=repairs.user_id LEFT JOIN repairmans ON repairmans.id = repairs.repairman_id JOIN equipments ON equipments.id = repairs.equipment_id JOIN rooms ON rooms.id = repairs.room_id JOIN buildings ON buildings.id = rooms.building_id WHERE repairs.id=?', [id])
        ]);
        console.log(repairs[0]);
        res.render('repair/edit', {
            equipments: equipments[0],
            buildings: buildings[0],
            rooms: rooms[0],
            repairs: repairs[0],
            role : req.session.role,
            repairmans :repairmans[0]
        })
    } catch (error) {
        console.log('Error occurred while fetching data:', error);
        res.status(500).send('Failed to fetch data!');
    } finally {
        connection.release();
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
            if (file) {
                const file = req.file;
                await connection.query('UPDATE repairs SET room_id=?, building_id=? ,equipment_id=? ,datetime_repair=?,other=?,details=?,update_at=?,img=? WHERE id=?', [req.body.rooms, req.body.buildings, req.body.equipments, req.body.datetime_repair, req.body.other, req.body.details, dateStr, file.filename, id]);
                await connection.commit();
                console.log('Transaction committed successfully!!');
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

router.delete('/delete/:id', (req, res) => {
    let id = req.params.id;
    const date = new Date();
    const dateStr =
        date.getFullYear() + "-" +
        ("00" + (date.getMonth() + 1)).slice(-2) + "-" +
        ("00" + date.getDate()).slice(-2) + " " +
        ("00" + date.getHours()).slice(-2) + ":" +
        ("00" + date.getMinutes()).slice(-2) + ":" +
        ("00" + date.getSeconds()).slice(-2);
    dbConnection.execute('UPDATE repairs SET delete_at=?, status=? WHERE id=?', [dateStr, 5, id])
        .then(([rows]) => {
            res.redirect('/');
        });
});

module.exports = router;