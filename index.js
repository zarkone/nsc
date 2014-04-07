var daemon = require('./server').daemon,
    model = {};

model.__proto__ = require('./server').model;
model._commands = {

    test1: { name: "test1", params: {}, exec: function () { console.log("test1"); } },
    test2: { name: "test2", 
             params: { message: "Message to show"}, 
             exec: function (params) { console.log(params.message); } 
           }
};

var d = daemon.create(model);

