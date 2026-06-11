const dotenv = require('dotenv').config();
const mysql = require('mysql2');

console.log(process.env.DB_HOST);
console.log(process.env.DB_DATABASE);
console.log(process.env.DB_USER);
console.log(process.env.DB_PORT);

const dbConfig = {
  host:  process.env.DB_HOST,
  database: process.env.DB_DATABASE, 
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

const connection = mysql.createConnection(dbConfig);

connection.connect((err) => {
  if (err) throw err;
  console.log('Conectado ao banco de dados MySQL!?');
});

module.exports = {
  connection
};
