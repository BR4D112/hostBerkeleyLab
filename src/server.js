const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const net = require('net');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const servers = [
    { ip: '192.168.128.5', port: 5001, active: false, difference: 0 },
    { ip: '192.168.128.5', port: 5002, active: false, difference: 0 },
];

/*
let activeServerNumbers = [
    { serverIp: '192.168.128.5:5001', number: Math.floor(Math.random() * 3001) - 1500 },
    { serverIp: '192.168.1.2:5000', number: Math.floor(Math.random() * 3001) - 1500 },
    { serverIp: '192.168.1.3:5000', number: Math.floor(Math.random() * 3001) - 1500 },
    { serverIp: '192.168.1.4:5000', number: Math.floor(Math.random() * 3001) - 1500 },
    { serverIp: '192.168.1.5:5000', number: Math.floor(Math.random() * 3001) - 1500 },
];
*/
let average = 0;


function updateServerDifferences() {
    let sum = 0;
    let count = 0;

    

    // Calculate the sum of differences and the count of active servers
    servers.forEach(server => {
        if (server.active) {
            sum += server.difference;
            count++;
            console.log(`Primera diferencia Server ${server.ip}:${server.port} difference: ${server.difference}`);
        }
    });

    // Calculate the average difference
    let average = Math.floor(sum / (count + 1));

    // Subtract the average from each server's difference
    servers.forEach(server => {
        if (server.active) {
            server.difference -= average;
            console.log(`Segunda diferencia Server ${server.ip}:${server.port} difference: ${server.difference}`);
        }
    });
}

function logServerNumbers() {
    let now = new Date();
    let timestamp = now.toISOString();

    let logMessage = `${firstTime} - Average difference: ${average}`;

    for (let i = 0; i < activeServerNumbers.length; i++) {
        logMessage += `, Difference for node ${i + 1}: ${activeServerNumbers[i].number}`;
    }

    console.log(logMessage);
}
/*
// Changed from GET to POST
app.post('/difTime', (req, res) => {
    const cuerpoJSON = req.body;
    const nodo = cuerpoJSON.nodo;
    const diferenciaTiempo = cuerpoJSON.diferencia_tiempo;

    if (nodo && diferenciaTiempo) {
        activeServerNumbers.push({ nodo, diferenciaTiempo });
    }
    res.send(`Number received. ${nodo} ${diferenciaTiempo}`);

    wss.clients.forEach((client) => {
        client.send(`Number received. ${nodo} ${diferenciaTiempo}`);
    });

    console.log(`Nodo: ${nodo}, Diferencia de Tiempo: ${diferenciaTiempo}`);
});
*/
let firstTime;


/*
app.post('/timeReq', (req, res) => {
    const date = new Date().toISOString();

    servers.forEach(server => {
        if (server.active) {
            axios.get(`http://${server.ip}:${server.port}/getdiff`, {
                data: { date: date }
            })
            .then(function (response) {
                server.difference = parseInt(response.data.difference);
                console.log(date);
                console.log(response.data);
                console.log(server.difference);
            })
            .catch(function (error) {
                console.log(error);
            });
        }
    });

    res.sendStatus(200);
});
*/

app.post('/timeReq', (req, res) => {
    const date = new Date().toISOString();

    servers.forEach(server => {
        if (server.active) {
            axios.get(`http://${server.ip}:${server.port}/getdiff`, {
                data: { date: date }
            })
            .then(function (response) {
                server.difference = parseInt(response.data.difference);
                console.log(date);
                console.log(response.data);
                console.log(server.difference);

                updateServerDifferences();

                // Send the updated difference to the Python server
                axios.post(`http://${server.ip}:${server.port}/update-diff`, {
                    difference: server.difference
                })
                .then(function (response) {
                    console.log('Difference updated successfully');
                })
                .catch(function (error) {
                    console.log('Failed to update difference: ', error);
                });
            })
            .catch(function (error) {
                console.log(error);
            });
        }
    });

    res.sendStatus(200);
});
/*
app.post('/setdifference/:id', (req, res) => {
    const server = activeServerNumbers.find(server => server.serverIp === req.params.id);

    if (server) {
        res.json({ difference: `${server.number}` });
    } else {
        res.json({ difference: `Not found ${req.params.id}` });
    }

    console.log(`ID received: ${req.params.id}`);
});
*/
function getFormattedDate() {
    const now = new Date();
    return {
        date: `${now.toISOString()}`
    }
}

function checkServerConnection(server) {
    return new Promise((resolve) => {
        const socket = net.createConnection(server.port, server.ip, () => {
            resolve(true);
            socket.end();
        });

        socket.on('error', () => {
            resolve(false);
        });
    });
}

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log('received: %s', message);
        ws.send(`received: ${message}`);
    });

    // Verificar la conexión con los servidores cada segundo
    setInterval(async () => {
        for (let server of servers) {
            server.active = await checkServerConnection(server);
        }

        ws.send(JSON.stringify(servers));
    }, 1000);
});

server.listen(process.env.PORT || 8999, () => {
    const message = `Good Server started on port ${server.address().port}`;
    console.log(message);

    // Enviar el mensaje inicial a todos los clientes conectados
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'log', message }));
        }
    });
});