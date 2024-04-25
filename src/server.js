const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const net = require('net');

const app = express();

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize a simple http server
const server = http.createServer(app);

// Initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

// List of servers to monitor
const servers = [
    { ip: '127.0.0.1', port: 8000 },
    // Add more servers as needed
];

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