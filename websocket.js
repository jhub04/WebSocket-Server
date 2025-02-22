const net = require("net");
const crypto = require("crypto");

const clients = new Set();

const httpServer = net.createServer((connection) => {
  connection.on("data", () => {
    let content = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    WebSocket test page
    <script>
      let ws = new WebSocket('ws://localhost:3001');
      ws.onmessage = event => alert('Message from server: ' + event.data);
      ws.onopen = () => ws.send('hello');
    </script>
  </body>
</html>
`;
    connection.write(
      "HTTP/1.1 200 OK\r\nContent-Length: " +
        content.length +
        "\r\n\r\n" +
        content
    );
  });
});

httpServer.listen(3000, () => {
  console.log("HTTP server listening on port 3000");
});

const wsServer = net.createServer((connection) => {
  console.log("Client connected");
  clients.add(connection);

  let isWebSocketUpgraded = false;

  connection.on("data", (data) => {
    if (!isWebSocketUpgraded) {
        console.log("\nReceived handshake request:\n", data.toString());
        connection.write(performHandshake(data));
        isWebSocketUpgraded = true;
        return; // Do not process handshake data as a message
    }

    console.log("Raw WebSocket frame received:", data);
    const message = decodeWebSocketFrame(data);
    console.log("Decoded data from client:", message);
    broadcast(message);
});

  connection.on("close", () => {
    console.log("Client disconnected");
    clients.delete(connection);
  });

  connection.on("error", (err) => {
    console.error("Connection error:", err);
    clients.delete(connection); 
  })
});


wsServer.on("error", (error) => {
  console.error("Error:", error);
});


wsServer.listen(3001, () => {
  console.log("WebSocket server listening on port 3001");
});

function broadcast(message) {
    const frame = encodeWebSocketFrame(message);
    for (let client of clients) {
        client.write(frame);
    }
}

function extractSecKey(data) {
    data = data.toString();
    let lines = data.split("\r\n");
    let key;

    for (const line of lines) {
        let keyAndValue = line.split(":");

        if (keyAndValue[0].trim() === "Sec-WebSocket-Key") {
            key = keyAndValue[1].trim();
        }
    }
    return key;
}

function generateWebSocketAccept(data) {
    const rfcConstant = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    const key = extractSecKey(data);
    if (!key) return null;
    
    return crypto.createHash('sha1').update(key + rfcConstant).digest('base64');

}
// Perform the handshake

function performHandshake(data) {
    const acceptKey = generateWebSocketAccept(data);
    if (!acceptKey) return null;
    let response = 
    "HTTP/1.1 101 Switching Protocols\r\n" +
    "Upgrade: websocket\r\n" + 
    "Connection: Upgrade\r\n" +
    "Sec-WebSocket-Accept: " + acceptKey + "\r\n\r\n";
    
    return response;
}

function decodeWebSocketFrame(bytes) {
    let length = bytes[1] & 127;
    let maskStart = 2;
    let dataStart = maskStart + 4;
    let decodedMessage = "";

    for (let i = dataStart; i < dataStart + length; i++) {
        let byte = bytes[i] ^ bytes[maskStart + ((i - dataStart) % 4)];
        decodedMessage += String.fromCharCode(byte);
    }
    return decodedMessage;
}

function encodeWebSocketFrame(message) {
    const messageBuffer = Buffer.from(message, 'utf-8');
    const frame = Buffer.alloc(2 + messageBuffer.length);

    frame[0] = 0x81 // FIN + text frame
    frame[1] = messageBuffer.length;

    messageBuffer.copy(frame, 2);
    return frame;
}
