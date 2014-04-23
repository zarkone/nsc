var daemon = require('./server').daemon,
    model = {},
    fs = require('fs');

var mplayer,
    clientID = 'f5dcaf5f7c97d2996bb30bb40d23ee57',
    sounddir = '/home/zarkone/docs/nsc/code/sounds/',
    isPlaying = false;

function spawnMplayer(filename) {
    return require('child_process').
        spawn('mplayer', ['-slave', '-quiet', filename]);
}

// https://api.soundcloud.com/tracks.format?consumer_key=apigee&tags=pop&filter=all&order=hotness

model.__proto__ = require('./server').model;
model._commands = {
   
    list: { 
        name: "list", 
        params: {},
        exec: function(params) {
            return fs.readdirSync('sounds');
        }
            
    }
};
var d = daemon.create(model);
console.log('creted daemon');
daemon._commands = {
    pause: { 
        name: "pause", 
        params: {},
        exec: function(params) {

            if (isPlaying) {
                mplayer.stdin.write('pause\n');
                isPlaying = false;
            }

            return 0;
        }
            
    },
    resume: { 
        name: "resume", 
        params: {},
        exec: function(params) {

            if (!isPlaying) {
                mplayer.stdin.write('pause\n');
                isPlaying = true;
            }

            return 0;
        }
            
    },
    
    play: { 
    
        name: "play", 
        params: { filename: "File to play"}, 
        exec: function (params) { 
            
            if (isPlaying) {
                mplayer.stdin.write('quit\n');
            }

            mplayer = spawnMplayer(sounddir + params.filename);
            isPlaying = true;

            return 0;
            
        }
    }
};



