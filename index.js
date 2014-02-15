var daemon = require('./server').daemon,
    model = { _commands: {} };

model.__proto__ = require('./server').model;

var d = daemon.create(model);
