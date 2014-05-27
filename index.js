var daemon = require('./server').daemon,
    model = {},
    events = require('events'),
    EventEmitter = new events.EventEmitter(),
    http = require('http'),
    querystring = require('querystring'),
    fs = require('fs');

var mplayer,
    clientID = 'f5dcaf5f7c97d2996bb30bb40d23ee57',
    sounddir = '/home/zarkone/docs/nsc/code/sounds/',
    isPlaying = false;

function spawnMplayer(filename) {
    mplayer = require('child_process').
        spawn('mplayer', ['-slave', '-quiet',
                          '-cache', '100', 
                          '-cache-min', '10', 
                          filename]);

    createTimePositionWatcher();
}

function runTimePosWatcher() {

    mplayer.stdin.write('get_time_pos\n');
    setTimeout(runTimePosWatcher, 200);
};

function createTimePositionWatcher() {

    var timeRegex = /^ANS_TIME_POSITION=(\d+\.+\d+)/;

    mplayer.stdout.on('data', function(chunk) {
        
        var timeString = chunk.toString().trimRight(),
            time = timeRegex.exec(timeString);
        
        if (time !== null) {
            EventEmitter.emit('mplayer_time_pos', time[1]);
        }
    });

    runTimePosWatcher();
}

EventEmitter.on('mplayer_time_pos', function(timePos) {
    daemon._publisher.send('TIMEPOS ' + timePos);
});

// https://api.soundcloud.com/tracks.format?consumer_key=apigee&tags=pop&filter=all&order=hotness

model.__proto__ = require('./server').model;
model._commands = {
   
    list: { 
        name: "list", 
        params: {},
        exec: function(params) {
            return fs.readdirSync('sounds');
        }
            
    },
    getTaggedTracks: {
        name: "getTaggedTracks",
        params: { "tag": "tag to search"},
        exec: function(params) {

            var getParams = querystring.stringify({ 
                    consumer_key: clientID, 
                    tags: params.tag, 
                    filter: 'all',
                    order: 'hotness'
                });
            console.log(getParams);
            var options = {
                host: 'api.soundcloud.com',
                path: '/tracks.json?' + getParams,
                port: 80,
                method: 'GET'
            };

            var callback = function(response) {
                var responseString = '';

                //another chunk of data has been recieved, so append it to `responseString`
                response.on('data', function (chunk) {
                    responseString += chunk;
                });

                //the whole response has been recieved, so we just print it out here
                response.on('end', function () {

                    var allTracks = JSON.parse(responseString);
                    params.onGet(allTracks);

                    allTracks.forEach(function(track) {
                        // console.log(track.title, track.stream_url);
                    });

                });
            };

            http.request(options, callback).end();
           // https://api.soundcloud.com/tracks.json?consumer_key=f5dcaf5f7c97d2996bb30bb40d23ee57&tags=pop&filter=all&order=created_at
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
            console.log('pause');
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
    
    playFile: { 
        name: "play", 
        params: { filename: "File to play"}, 
        exec: function (params) { 
            
            if (isPlaying) {
                mplayer.stdin.write('quit\n');
            }

            spawnMplayer(sounddir + params.filename);
            isPlaying = true;

            return 0;
            
        }
    },
    playRadio: {
        name: "",
        params: { tag: "tag to play" },
        exec: function(params) {
            // console.log(this);
            var play = spawnMplayer;

            function onGet (allTracks) {

                if (isPlaying) {
                    mplayer.stdin.write('quit\n');
                }

                play(allTracks[0].stream_url + "?consumer_key=" + clientID);
                isPlaying= true;
            }

            model.exec({ 
                name: "getTaggedTracks", 
                params: { 
                    tag: params.tag,
                    onGet: onGet 
                }
            });
            
            return 0;
        }
    }
};



