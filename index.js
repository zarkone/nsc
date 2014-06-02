 var daemon = require('./server').daemon,
    model = {},
    events = require('events'),
    EventEmitter = new events.EventEmitter(),
    rest = require('rest'), 
    querystring = require('querystring'),
    fs = require('fs');

var mplayer,
    timePosTimeout,
    clientID = 'f5dcaf5f7c97d2996bb30bb40d23ee57',
    sounddir = '/home/zarkone/docs/nsc/code/sounds/',
    isPlaying = false;

function spawnMplayer(filename) {

    mplayer = require('child_process').
        spawn('mplayer', ['-slave', '-quiet',
                          '-cache', '100', 
                          '-ao','alsa',
                          '-cache-min', '10', 
                          filename]);

    // mplayer.stdout.pipe(process.stdout);
    createTimePositionWatcher();
}


function createTimePositionWatcher() {

    var timeRegex = /^ANS_TIME_POSITION=(\d+)\.(\d+)/;

    mplayer.stdout.on('data', function(chunk) {
        var matches = chunk.toString().trim().match(timeRegex);

        if (matches) {
            var timestamp = matches[1] * 1000 + matches[2] * 100;
            EventEmitter.emit('mplayer_time_pos', timestamp);
        }
    });
    
    requestTimePos();

}

EventEmitter.on('mplayer_time_pos', function(timePos) {
    console.log(timePos);
    daemon._publisher.send('TIMEPOS ' + timePos);

});

function requestTimePos() {

    if (mplayer.stdin === undefined) return;

    mplayer.stdin.write('get_time_pos\n');            
    timePosTimeout = setTimeout(requestTimePos, 100);
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
                    // order: 'created_at'
                    order: 'hotness'
                });

            return rest(path + apiParams)
                .then(function (request) { return request.entity; })
                .then(JSON.parse);

           // https://api.soundcloud.com/tracks.json?consumer_key=f5dcaf5f7c97d2996bb30bb40d23ee57&tags=pop&filter=all&order=created_at
        }
    }
};

var d = daemon.create(model);
console.log('creted daemon');


daemon._playlist = null;
daemon.getComments = function (trackId) {

    var path = 'http://api.soundcloud.com/tracks/'+ trackId+'/comments.json?',
        apiParams = querystring.stringify({ 
            consumer_key: clientID
        });

    return rest(path + apiParams)
        .then(function (request) { return request.entity; })
        .then(JSON.parse);
    
};
daemon.next = function next() { 
    
    var playlistLength = model._playlist.length || 0;
    
    if (playlistLength == 0) return 0;
    
    model._currentTrackIndex++;

    if (model._currentTrackIndex >= playlistLength) {
        model._currentTrackIndex = 0;
    }

    daemon.play();
    return 0;
};

daemon.play = function play() {

    var currentTrack = model._playlist[model._currentTrackIndex];

    console.log('Playing: ' + currentTrack.title + ' ['+ currentTrack.duration +']');
    console.log('URL: ' + currentTrack.stream_url);
    console.log(currentTrack.id);
    var commentsPromise = daemon.getComments(currentTrack.id);

    commentsPromise.done(function(comments) {
        comments.sort(function (a,b) { return a.timestamp*1 - b.timestamp*1; })
            .forEach(function(comment) {
            console.log(comment.body, comment.timestamp);
        });
    });

    if (isPlaying) {

        mplayer.removeAllListeners('close');
        mplayer.stdin.write('quit\n');
    }
    
    spawnMplayer(currentTrack.stream_url + "?consumer_key=" + clientID);

    mplayer.on('close', function () { 
        isPlaying = false;
        daemon.next();
    });

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

        exec: daemon.next
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
            allTracks.then(daemon.play);
            allTracks.done(function () {     

                mplayer.on('close', function (code) {
                    isPlaying = false;
                    daemon.next();
                });
            });

            return 0;
        }
    }
};



