const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const net = require('net');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies
app.use(bodyParser.json());

// Initialize a simple http server
const server = http.createServer(app);

// Initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

// List of servers to monitor
const servers = [
    { ip: '192.168.128.5', port: 3400 },
    // Add more servers as needed
];

// List to store numbers from active servers
/*
let activeServerNumbers = [];
*/


let activeServerNumbers = [
    { serverIp: '192.168.128.5:3400', number: Math.floor(Math.random() * 3001) - 1500 },
    { serverIp: '192.168.1.2:5000', number: Math.floor(Math.random() * 3001) - 1500 },
    { serverIp: '192.168.1.3:5000', number: Math.floor(Math.random() * 3001) - 1500 },
    { serverIp: '192.168.1.4:5000', number: Math.floor(Math.random() * 3001) - 1500 },
    { serverIp: '192.168.1.5:5000', number: Math.floor(Math.random() * 3001) - 1500 },
    // Add more as needed
];

let average = 0;

function updateServerNumbers() {
    console.log(activeServerNumbers);
    // Calculate the average
    let sum = 0;
    for (let server of activeServerNumbers) {
        sum += server.number;
    }

    average = Math.floor(sum / (activeServerNumbers.length + 1));

    // Subtract the average from each number and update the list
    for (let server of activeServerNumbers) {
        server.number -= average;
    }
    console.log(activeServerNumbers);

    // Send the updated list to all connected clients
    wss.clients.forEach((client) => {
        client.send(JSON.stringify(activeServerNumbers));
    });
}

function logServerNumbers() {
    // Get the current date and time
    let now = new Date();
    let timestamp = now.toISOString();

    // Start the log message
    let logMessage = `${firstTime} - Average difference: ${average}`;

    // Add the difference for each node
    for (let i = 0; i < activeServerNumbers.length; i++) {
        logMessage += `, Difference for node ${i + 1}: ${activeServerNumbers[i].number}`;
    }

    // Log the message
    console.log(logMessage);
}



app.get('/difTime', (req, res) => {

    // El cuerpo JSON de la solicitud estará disponible en req.body
    const cuerpoJSON = req.body;

    // Desempaquetar la diferencia de tiempo del cuerpo JSON
    const nodo = cuerpoJSON.nodo;
    const diferenciaTiempo = cuerpoJSON.diferencia_tiempo;

    if (nodo && diferenciaTiempo) {
        activeServerNumbers.push({ nodo, diferenciaTiempo });
    }
    res.send(`Number received. ${nodo} ${diferenciaTiempo}`);

    wss.clients.forEach((client) => {
        client.send(`Number received. ${nodo} ${diferenciaTiempo}`);
    });

    // Hacer algo con los datos desempaquetados
    console.log(`Nodo: ${nodo}, Diferencia de Tiempo: ${diferenciaTiempo}`);
});


let firstTime;

app.post('/timeReq', (req, res) => {
    //sendDateToActiveServers();
    firstTime = JSON.stringify(getFormattedDate());

    // Send the log message to the client
    wss.clients.forEach((client) => {
        client.send(`Time send to all servers: ${firstTime}`);
    });

    res.send(firstTime);
});



app.post('/setdifference/:id', (req, res) => {
    // Find the server with the matching IP
    const server = activeServerNumbers.find(server => server.serverIp === req.params.id);

    if (server) {
        // If the server is found, update the number and send a response
        //server.number = req.body.number;
        res.json({ difference: `${server.number}` });
    } else {
        // If the server is not found, send a different response
        res.json({ difference: `Not found ${req.params.id}` });
    }

    // Log the received ID
    console.log(`ID received: ${req.params.id}`);
});


function getFormattedDate() {
    const now = new Date();
    return {
        date: `${now.toISOString()}`
    }
}


wss.on('connection', (ws) => {
    // Connection is up, let's add a simple event
    ws.on('message', (message) => {
        // Log the received message and send it to the client
        console.log('received: %s', message);
        ws.send(`received: ${message}`);
    });

    // Send the current list to the client when they connect
    ws.send(JSON.stringify(activeServerNumbers));
});

// Start the server
server.listen(process.env.PORT || 8999, () => {
    wss.clients.forEach((client) => {
        client.send(`Good Server started on port ${server.address().port}`);
    });
    updateServerNumbers();
    console.log(`Good Server started on port ${server.address().port}`);
});