var zmq = require('zmq'),
    util = require('util'),
    responder = zmq.socket('rep');

var Model = {
    _commands: null
};

Model.getCommands = function () {
    return this._commands;
};

Model.exec = function (cmd) {

    var answer;
    console.log(cmd);

    if (this._commands[cmd.name] === undefined) {
        console.log(this._commands);
        console.error("No such command: ", cmd.name);

    } else {
        answer = this._commands[cmd.name].exec(cmd.params);
    }
    
    return answer;
    
};

var Daemon = {

    _model: null,
    _responder: zmq.socket('rep'),
    _publisher: zmq.socket('pub')
};

Daemon.__proto__ = Model;

Daemon.getCommands = function () {
    
    var modelCommands = this._model.getCommands();

    for (var i in this._commands) {
        modelCommands[i] = this._commands[i];
    }

    return modelCommands;
};

Daemon.exec = function (cmd) {

    var answer;

    if (this._commands[cmd.name] !== undefined) {
        answer = this._commands[cmd.name].exec(cmd.params);
    }

    return answer;
    
};

Daemon._processMessage = function (request) {

    var cmd,
        answer = {};

    try {
        cmd = JSON.parse(request.toString());

    } catch (e) {
        console.log(e.message);
        this._responder.send('{ "error" : "bad command format"}');        

        return;
    }

    answer = this.exec(cmd);

    if (answer === undefined) {
        answer = this.getCommands();
    }
    
    this._responder.send('{ "error" : "no such command", "params": { "commands" : ' + JSON.stringify(answer) + ' } }');
    
};

Daemon.create = function (model) {
    
    var daemon = Object.create(this);

    daemon._model = model;
    
    daemon._responder.bind('tcp://*:5555', function(err) {

        if (err) {
            console.log(err);

        } else {
            console.log("Listening on 5555...");
        }
    });

    daemon._publisher.bind('tcp://*:5556', function(err) {

        if (err) {
            console.log(err);

        } else {
            console.log("Publishing on 5556...");
        }
    });

    daemon._responder.on('message', function (req) { 
        daemon._processMessage(req); 
    });
    
};

module.exports = {

    daemon: Daemon,
    model: Model
};
