const express = require('express');
//const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const net = require('net');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();

app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let lastPort = 5123; // Puerto inicial crear server


const servers = [
    //{ ip: '192.168.128.4', port: 5001, active: false, difference: 0 },
    //{ ip: '192.168.128.4', port: 5002, active: false, difference: 0 },
];

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
            sendLog(`LOG [${getFormattedDate().date}] ${server.ip} set new diference`);
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

function createServer(id) {
    lastPort += 1; // Incrementar el puerto
    const ip = '192.168.128.4'; // IP inicial
    const newServer = { ip: ip, id: id, port: lastPort, active: false, leadStatus: false };
    servers.push(newServer);

    const scriptPath = path.join(__dirname, 'serverCreator.sh');

    // Ejecutar el script con ip y port como parámetros
    exec(`${scriptPath} ${lastPort}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error al ejecutar el script: ${error}`);
            return;
        }
        console.log(`Salida del script: ${stdout}`);
        console.error(`Errores del script: ${stderr}`);
    });
    console.log(servers);    

    return newServer;
}

function logServerNumbers() {
    let now = new Date();
    let timestamp = now.toISOString();

    let logMessage = `${firstTime} - Average difference: ${average}`;

    for (let i = 0; i < activeServerNumbers.length; i++) {
        logMessage += `, Difference for node ${i + 1}: ${activeServerNumbers[i].number}`;
    }

    console.log(logMessage);
    sendLog(logMessage);
}

let firstTime;

app.post('/createServer', (req, res) => {
    const newServer = createServer(req.body.id);
    res.json(newServer);
});

app.post('/stopServer', (req, res) => {
    res.json(req.body.port);
});



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
                    sendLog(`LOG [${date}] ${server.ip} has new difference update`);
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

app.post('/leadStatus', (req, res) => {
    const { port, leadStatus } = req.body;
    console.log('cambiando el estado a lider');

    // Convert port to a number
    const portNumber = parseInt(port, 10);
    console.log(portNumber);

    // Find the server with the specified port
    const server = servers.find(server => server.port === portNumber);
    console.log(servers);
    if (!server) {
        res.status(404).json({ message: 'Server not found' });
    } else {
        // Update the leadStatus of the server
        server.leadStatus = leadStatus;
        res.json({ message: 'Lead status updated successfully' });
    }
});

function getFormattedDate() {
    const now = new Date();
    return {
        date: `${now.toISOString()}`
    }
}
function sendLog(messageIn){
    wss.on("connection", (ws)=>{
        ws.on('message', ()=>{
            ws.send(`received: ${messageIn}`);
        })
    })
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