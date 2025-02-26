// websocket.js
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;

let wss;

function authenticateWebSocket(connection, info, next) {
  const token = info.req.headers.authorization?.split(" ")[1] || "";
  if (!token) {
    connection.destroy();
    return;
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    info.req.user = decoded;
    next();
  } catch (ex) {
    connection.destroy();
  }
}

function setupWebSocket(server) {
  wss = new WebSocket.Server({ noServer: true });

  server.on("upgrade", function upgrade(request, socket, head) {
    authenticateWebSocket(socket, { req: request }, function () {
      wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit("connection", ws, request);
      });
    });
  });

  wss.on("connection", function connection(ws) {
    ws.on("message", function incoming(message) {
      console.log("received: %s", message);
    });

    ws.send("connected");
  });
}

function broadcastNewOrder(order) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(order));
    }
  });
}

module.exports = { setupWebSocket, broadcastNewOrder };
