var zmq = require('zmq');

var requester = zmq.socket('req');


requester.on("message", function(reply) {
    
    var obj = JSON.parse(reply.toString());
    
    console.log(obj);

    process.stdin.write("> ");
    process.stdin.resume();

});

requester.connect("tcp://localhost:5555");

process.stdin.on('data', function (input) { 

    process.stdin.pause();
    var req = JSON.stringify({ name: input.toString().trimRight(), params: { message: "hahah" } });

    requester.send(req);

});

process.stdin.resume();

process.on('SIGINT', function() {
    requester.close();
});
