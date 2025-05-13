const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');

app.use(express.static('public'));

let client = null;

function startBot() {
    client = new Client();

    client.on('qr', async (qr) => {
        const qrImage = await qrcode.toDataURL(qr);
        io.emit('qr', qrImage);
        io.emit('log', 'QR Code gerado. Escaneie com o WhatsApp.');
    });

    client.on('ready', () => {
        io.emit('ready', 'Cliente conectado!');
        io.emit('log', 'WhatsApp conectado com sucesso!');
    });

    client.on('disconnected', (reason) => {
        io.emit('disconnected', 'Desconectado do WhatsApp.');
        io.emit('log', `Desconectado: ${reason}`);
        client = null;
    });

    client.initialize();
    io.emit('log', 'Bot inicializado. Aguardando QR Code...');
}

io.on('connection', (socket) => {
    socket.on('start', () => {
        if (!client) {
            startBot();
        } else {
            io.emit('log', 'Bot já está rodando.');
        }
    });

    socket.on('disconnect-bot', () => {
        if (client) {
            client.destroy();
            client = null;
            io.emit('disconnected', 'Desconectado do WhatsApp.');
            io.emit('log', 'Bot desconectado manualmente.');
        } else {
            io.emit('log', 'Bot já está desconectado.');
        }
    });

    socket.emit('log', 'Bem-vindo! Clique em "Gerar QR Code" para iniciar.');
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});