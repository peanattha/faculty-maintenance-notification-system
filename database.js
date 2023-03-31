const mysql = require('mysql2');
const dbConnection = mysql.createPool({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'project_co-op'
}).promise();
module.exports = dbConnection;