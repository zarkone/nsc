var format = require('util').format,
    readline = require('readline'),
    rl = readline.createInterface(process.stdin, process.stdout),
    zmq = require('zmq'),
    rq = zmq.socket('req'),
    timeSub = zmq.socket('sub');


rq.connect(format('tcp://%s:5555', process.argv[2]));
timeSub.connect(format('tcp://%s:5556', process.argv[2]));
timeSub.subscribe('TIMEPOS');

rq.on("message", function(reply) {
    
    var obj = JSON.parse(reply.toString());

    if (obj !== 0) {
        console.log(obj);
    }
    
    rl.prompt();

});

timeSub.on('message', function(time) {
    console.log(time.toString());
    rl.prompt();
});

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
