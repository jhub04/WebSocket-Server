const net = require("net");

// Simple HTTP server responds with a simple WebSocket client test
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

  connection.on("data", (data) => {
    console.log("Data received from client:", data.toString());

    // Perform ws handshake 
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

// extract Sec-WebSocket-Key

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



// compute Web-Socket-Accept
// Perform the handshake
