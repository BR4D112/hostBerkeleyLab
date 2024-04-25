const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const net = require('net');
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

app.post('/timeReq', (req, res) => {
    sendDateToActiveServers();
    res.send(getFormattedDate());
});

function sendDateToActiveServers() {
    servers.forEach((server) => {
        const socket = net.createConnection(server.port, server.ip);

        socket.on('connect', () => {
            // Send the current date to the server
            socket.write(getFormattedDate());
            socket.end();
        });
    });
}

wss.on('connection', (ws) => {
    // Connection is up, let's add a simple event
    ws.on('message', (message) => {
        // Log the received message and send it to the client
        console.log('received: %s', message);
        ws.send(`received: ${message}`);
    });

    // Monitor servers
    setInterval(() => {
        servers.forEach((server) => {
            const socket = net.createConnection(server.port, server.ip);

            socket.on('connect', () => {
                const message = `Server at ${server.ip}:${server.port} is active ${getFormattedDate()}`;
                console.log(message);
                ws.send(message);
                socket.end();
            });

            socket.on('error', () => {
                const message = `Server at ${server.ip}:${server.port} is inactive ${getFormattedDate()}`;
                console.log(message);
                ws.send(message);
            });
        });
    }, 1000); // Check every second
});

function getFormattedDate() {
    const now = new Date();
    return `[${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}:${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}]`;
}

// Start the server
server.listen(process.env.PORT || 8999, () => {
    console.log(`Server started on port ${server.address().port}`);
});