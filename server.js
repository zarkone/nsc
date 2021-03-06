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

    if (this._commands[cmd.name] === undefined) {
        console.error("No such command: ", cmd.name);

    } else {
        answer = this._commands[cmd.name].exec(cmd.params);
    }
    
    return answer;
    
};

var Daemon = {

    _model: null,
    _responder: zmq.socket('rep')
};

Daemon.__proto__ = Model;

Daemon.getCommands = function () {
    
    var modelCommands = this._model.getCommands();

    for (var i in this._commands) {
        modelCommands[i] = this.commands[i];
    }

    return modelCommands;
};

Daemon.exec = function (cmd) {

    var answer;

    if (this._commands[cmd.name] === undefined) {

        answer = this._model.exec(cmd);

    } else {
        console.log("Daemon.exec");
        answer = this._command[cmd.name].exec(cmd.params);
    }

    return answer;
    
};

/**
command  = {
    name: "haha",
    params: {
        first: "f",
        second: "s"

    }
}
*/
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

    this._responder.send(JSON.stringify(answer));
    
};

Daemon.create = function (model) {
    
    var daemon = Object.create(this);

    daemon._commands = {};
    daemon._model = model;
    
    daemon._responder.bind('tcp://*:5555', function(err) {

        if (err) {
            console.log(err);

        } else {
            console.log("Listening on 5555...");
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
