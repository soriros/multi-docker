import { redisHost, redisPort } from './keys.js';
import { createClient } from 'redis';

const redisClient = createClient({
    host: redisHost,
    port: redisPort,
    retry_strategy: () => 1000
});

const subscriber = redisClient.duplicate();

function fib(index) {
    if (index < 2) {
        return 1;
    }
    else {
        return fib(index - 1) + fib(index - 2);
    }
}

subscriber.on('message', (channel, message) => {
    console.log('message' ,message);
    let fibValue = fib(parseInt(message));
    console.log('fibValue' ,fibValue);
    redisClient.hset('values', message, fibValue);
});
subscriber.subscribe('insert');
