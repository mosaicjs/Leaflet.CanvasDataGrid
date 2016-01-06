var host = '0.0.0.0'; // '127.0.0.1';
var port = 8765;

var http = require('http');
var send = require('send');
var url = require('url');
var app = http.createServer(function(req, res) {
    send(req, url.parse(req.url).pathname).root(__dirname + '/../../').pipe(res);
});
app.listen(port, host);
var base = 'http://' + host + ':' + port;
console.log('Listening on ' + base + '/');
console.log(base + '/examples/index.html');
