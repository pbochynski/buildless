const net = require('net');
var server = net.createServer(function(socket) {
  socket.write('Echo server\r\n');
  socket.pipe(socket);
});
server.listen(3000);
console.log('Server running on port 3000');
