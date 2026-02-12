#!/usr/bin/env node
/**
 * Simple HTTP Server for Padel Tournament
 * Run this script to serve the padel-tournament.html file locally
 * Requires Node.js (https://nodejs.org/)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8000;
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Get file path
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    // Get file extension
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    // Read and serve file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    
    console.log('\n' + '='.repeat(60));
    console.log('  PADEL TOURNAMENT SERVER');
    console.log('='.repeat(60));
    console.log('\n🚀 Server started successfully!');
    console.log('\n📍 Local Access:');
    console.log(`   http://localhost:${PORT}/index.html`);
    console.log(`   http://127.0.0.1:${PORT}/index.html`);
    
    console.log('\n📱 Network Access (for devices on same network):');
    for (const name of Object.keys(networkInterfaces)) {
        for (const iface of networkInterfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`   http://${iface.address}:${PORT}/index.html`);
            }
        }
    }
    
    console.log('\n🌐 For ngrok access:');
    console.log('   1. Download ngrok from: https://ngrok.com/download');
    console.log(`   2. Run: ngrok http ${PORT}`);
    console.log('   3. Use the ngrok URL provided');
    console.log('\n⏹️  Press Ctrl+C to stop the server');
    console.log('='.repeat(60) + '\n');

    // Open browser automatically
    const url = `http://localhost:${PORT}/index.html`;
    const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${start} ${url}`, (err) => {
        if (err) console.log('Could not open browser automatically');
    });
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${PORT} is already in use!`);
        console.error('   Please stop the other server or change the port.\n');
    } else {
        console.error('\n❌ Server error:', err);
    }
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n\n' + '='.repeat(60));
    console.log('  Server stopped. Goodbye! 👋');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
});
