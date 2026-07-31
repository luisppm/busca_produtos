const dotenv = require('dotenv');
dotenv.config();
const mysql = require('mysql2');

let connection;

const dbConfig = {
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE, 
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

const mockConnection = {
  query: (sql, values, callback) => {
    const cb = typeof values === 'function' ? values : callback;
    console.warn('[AI Studio] Database offline or unconfigured — returning mock result');
    if (cb) {
      setImmediate(() => cb(null, [], []));
    }
  },
  end: () => {}
};

if (process.env.DB_HOST) {
  try {
    connection = mysql.createConnection(dbConfig);
    connection.connect((err) => {
      if (err) {
        console.warn('[AI Studio] Could not connect to MySQL database:', err.message);
        console.warn('[AI Studio] Falling back to mock database connection.');
        connection = mockConnection;
      } else {
        console.log('Conectado ao banco de dados MySQL');
      }
    });
  } catch (err) {
    console.warn('[AI Studio] Error initializing MySQL connection:', err.message);
    connection = mockConnection;
  }
} else {
  console.warn('[AI Studio] DB_HOST not defined — using mock database connection');
  connection = mockConnection;
}

module.exports = {
  get connection() {
    return connection || mockConnection;
  }
};

