import {mysqlDatabase, mysqlHost, mysqlPassword, mysqlPort, mysqlUser, redisHost, redisPort} from './keys.js';

// Express App Setup
import express from 'express';
import pkg_body_parser from 'body-parser';
import mysql from 'mysql';
import redis from 'redis';
import cors from 'cors';
const {json} = pkg_body_parser;

const app = express();
app.use(cors());
app.use(json());

const pool = mysql.createPool({
    host: mysqlHost,
    user: mysqlUser,
    password: mysqlPassword,
    database: mysqlDatabase,
    port: mysqlPort
});

pool.getConnection((error, connection) => {
    if(error) throw error;
    console.log('connected as id ' + connection.threadId);
    connection.release();
});

pool.query('CREATE TABLE IF NOT EXISTS values_table (number INT)', (error, response) => {
    if (error) {
        console.error('error querying: ' + error.stack);
    }
});

const redisClient = redis.createClient({
    host: redisHost,
    port: redisPort,
    retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();

// Express route handlers
app.get('/', (req, res) => {
    res.send('Hi');
});

app.get('/values/all', async (req, res) => {
    pool.query('SELECT * from values_table',(err, data) => {
        if(err) {
            console.error(err);
            return;
        }
        // rows fetch
        console.log('data: ', data);
        res.send(data);
    })
});

app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    });
});

app.post('/values', async (req, res) => {
    console.log("request.body", req.body);
    const index = req.body.index;
    if (parseInt(index) > 40) {
        return res.status(422).send('Index too high');
    }

    redisClient.hset('values', index, 'Nothing yet!');
    redisPublisher.publish('insert', index);
    let insertQuery = 'INSERT INTO values_table (number) VALUES (?)';
    let query = mysql.format(insertQuery,[index]);
    pool.query(query,(error, response) => {
        if(error) {
            console.error(error);
            return;
        }
        // rows added
        console.log(response.insertId);
    });
    console.log("send");
    res.send({working: true});
});

app.listen(5000, err => {
    console.log('Listening');
});

