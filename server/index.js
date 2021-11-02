import { pgUser, pgHost, pgDatabase, pgPassword, pgPort, redisHost, redisPort} from './keys.js';

// Express App Setup
import express from 'express';
import pkg_body_parser from 'body-parser';
const { json } = pkg_body_parser;
import cors from 'cors';

const app = express();
app.use(cors());
app.use(json());

// Postgres Client Setup
import pkg_pg from 'pg';
const { Pool } = pkg_pg;
const pgClient = new Pool({
    user: pgUser,
    host: pgHost,
    database: pgDatabase,
    password: pgPassword,
    port: pgPort
});
pgClient.on('error', () => console.log('Lost PG connection'));
pgClient.on("connect", (client) => {
    client
        .query("CREATE TABLE IF NOT EXISTS values (number INT)")
        .catch((err) => console.error(err));
});

// Redis Client Setup
import redis from 'redis';
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
    const values = await pgClient.query('SELECT * from values');
    console.log('rows', values.rows);
    res.send(values.rows);
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
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
    console.log("send");
    res.send({ working: true });
});

app.listen(5000, err => {
    console.log('Listening');
});

