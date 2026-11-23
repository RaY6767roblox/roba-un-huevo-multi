const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Ruta principal explícita para que siempre cargue index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const accounts = {
  "RaY": {
    user: "RaY",
    pass: "ben",
    money: 1e308,
    power: 1e308,
    speed: 22,
    capacity: 100,
    inventory: [],
    creatures: [],
    day: 100
  }
};

const players = {};

io.on('connection', (socket) => {
  socket.on('loginRequest', (data) => {
    const acc = accounts[data.user];
    if (!acc) {
      socket.emit('loginResponse', { success: false, message: 'La cuenta no existe.' });
      return;
    }
    if (acc.pass !== data.pass) {
      socket.emit('loginResponse', { success: false, message: 'Contraseña incorrecta.' });
      return;
    }
    if (data.user === "RaY") {
      acc.money = 1e308;
      acc.power = 1e308;
    }
    socket.emit('loginResponse', { success: true, data: acc });
  });

  socket.on('registerRequest', (data) => {
    if (accounts[data.user]) {
      socket.emit('registerResponse', { success: false, message: 'El usuario ya existe.' });
      return;
    }
    const newAcc = {
      user: data.user,
      pass: data.pass,
      money: 100,
      power: 10,
      speed: 10,
      capacity: 5,
      inventory: [],
      creatures: [],
      day: 1
    };
    accounts[data.user] = newAcc;
    socket.emit('registerResponse', { success: true, data: newAcc });
  });

  socket.on('saveGameData', (packet) => {
    if (accounts[packet.user]) {
      accounts[packet.user].money = (packet.user === "RaY") ? 1e308 : packet.data.money;
      accounts[packet.user].power = (packet.user === "RaY") ? 1e308 : packet.data.power;
      accounts[packet.user].speed = packet.data.speed;
      accounts[packet.user].capacity = packet.data.capacity;
      accounts[packet.user].inventory = packet.data.inventory;
      accounts[packet.user].creatures = packet.data.creatures;
      accounts[packet.user].day = packet.data.day;
    }
  });

  players[socket.id] = { id: socket.id, x: 250, z: 700 };
  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].z = movementData.z;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('disconnectPlayer', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
