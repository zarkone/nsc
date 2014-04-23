var format = require('util').format,
    readline = require('readline'),
    rl = readline.createInterface(process.stdin, process.stdout),
    zmq = require('zmq'),
    rq = zmq.socket('req');

rq.on("message", function(reply) {
    
    var obj = JSON.parse(reply.toString());

    if (obj !== 0) {
        console.log(obj);
    }
    
    rl.prompt();

});
console.log(format("tcp://%s:%d", process.argv[2], process.argv[3]));
rq.connect(format("tcp://%s:%d", process.argv[2], process.argv[3]));


rl.setPrompt('♪ ');
rl.prompt();

rl.on('line', function(line) {

    var inputArray = line.toString().trimRight().split(' '),
        command = inputArray[0], param = inputArray[1],
        request = JSON.stringify({ name: command, params: { filename: param } });

    rq.send(request);
    rl.prompt();

}).on('close', function() {
  
    console.log('Have a great day!');
    process.exit(0);

});
