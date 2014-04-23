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

    var inputArray = input.toString().trimRight().split(' '),
        command = inputArray[0], param = inputArray[1],
        req = JSON.stringify({ name: command, params: { filename: param } });

    requester.send(req);

});

process.stdin.resume();

process.on('SIGINT', function() {
    requester.close();
});
