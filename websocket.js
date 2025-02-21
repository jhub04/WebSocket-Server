const net = require("net");
const crypto = require("crypto");

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

// Incomplete WebSocket server
const wsServer = net.createServer((connection) => {
  console.log("Client connected");

  connection.once("data", (data) => {
    console.log("\nRecieved handshake request:\n", data.toString());
    connection.write(performHandshake(data));
  });

  connection.on("data", (data) => {
    console.log("Data received from client:", data);
    const message = decodeWebSocketFrame(data);
    console.log("Decoded data from client:", message);
  });

  connection.on("end", () => {
    console.log("Client disconnected");
  });
});


wsServer.on("error", (error) => {
  console.error("Error:", error);
});


wsServer.listen(3001, () => {
  console.log("WebSocket server listening on port 3001");
});

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
    let key = extractSecKey(data);
    
    const combinedKey = key + rfcConstant;

    const acceptKey = crypto.createHash('sha1').update(combinedKey).digest('base64');

    return acceptKey;

}
// Perform the handshake

function performHandshake(data) {
    let acceptKey = generateWebSocketAccept(data)
    let response = 
    "HTTP/1.1 101 Switching Protocols\r\n" +
    "Upgrade: websocket\r\n" + 
    "Connection: Upgrade\r\n" +
    "Sec-WebSocket-Accept: " + acceptKey + "\r\n\r\n";
    
    return response;
}
