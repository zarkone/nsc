var daemon = require('./server').daemon,
    model = {},
    events = require('events'),
    EventEmitter = new events.EventEmitter(),
    rest = require('rest'), 
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

    mplayer.on('close', function (code) {
        console.log('ps process exited with code ' + code);
    });
    // mplayer.stdout.pipe(process.stdout);
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

            var path = 'http://api.soundcloud.com/tracks.json?',
                apiParams = querystring.stringify({ 
                    consumer_key: clientID, 
                    tags: params.tag, 
                    filter: 'all',
                    order: 'created_at'
                });

            function getEntity(request) {
                return request.entity;
            }

            return rest(path + apiParams)
                .then(getEntity)
                .then(JSON.parse);

           // https://api.soundcloud.com/tracks.json?consumer_key=f5dcaf5f7c97d2996bb30bb40d23ee57&tags=pop&filter=all&order=created_at
        }
    }
};

var d = daemon.create(model);
console.log('creted daemon');


daemon._playlist = null;
daemon.play = function play() {


    var currentTrack = model._playlist[model._currentTrackIndex];

    console.log('Playing: ' + currentTrack.title + '['+ currentTrack.duration +']');
    console.log('URL: ' + currentTrack.stream_url);

    if (isPlaying) {
        mplayer.stdin.write('quit\n');
    }
    
    spawnMplayer(currentTrack.stream_url + "?consumer_key=" + clientID);
    isPlaying= true;

};

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
    
    'play-file': { 
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
    n: {
        name: "n", 
        params: { }, 

        exec: function n() { 
            
            var playlistLength = model._playlist.length || 0;
            
            if (playlistLength == 0) return 0;
            
            model._currentTrackIndex++;

            if (model._currentTrackIndex >= playlistLength) {
                model._currentTrackIndex = 0;
            }

            daemon.play();
            return 0;
        }
    },
    p: {
        name: "p",
        params: { tag: "tag to play" },
        exec: function p(params) {
            // console.log(this);


            function createPlaylist (allTracks) {
                
                model._playlist = allTracks.filter(function hasStreamUrl(track) {
                    return track.stream_url !== undefined;
                });

                model._currentTrackIndex = 0;

                return allTracks;
            }
            
            
            var allTracks = model.exec({ 

                name: "getTaggedTracks", 
                params: { 
                    tag: params.tag
                }
            });

            allTracks.then(createPlaylist);
            allTracks.done(daemon.play);

            return 0;
        }
    }
};



