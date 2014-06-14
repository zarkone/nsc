var format = require('util').format,
    zmq = require('zmq'),
    rq = zmq.socket('req'),
    timeSub = zmq.socket('sub');
    trackSub = zmq.socket('sub');


rq.connect(format('tcp://%s:5555', process.argv[2]));
timeSub.connect(format('tcp://%s:5556', process.argv[2]));
timeSub.subscribe('TIMEPOS');

trackSub.connect(format('tcp://%s:5556', process.argv[2]));
trackSub.subscribe('GETCURRENTTRACK');

var currentTrack , noComments = false;
rq.on('message', function(reply){

});


trackSub.on("message", function(reply) {

    if (/^GETCURRENTTRACK/.test(reply.toString()) == false) return;
    
    var replyMatches = /^GETCURRENTTRACK ({.*})/.exec(reply.toString());
        
    if (!replyMatches || !replyMatches[1]) return;

    var jsonReply = JSON.parse(replyMatches[1] || {});

    switch(jsonReply.command) {
        case 'getCurrentTrack': {

            currentTrack = jsonReply.data;

            if (!currentTrack.comments) {
                currentTrack.comments = [];
                noComments = true;
            } 

            titleBox.setContent( currentTrack.title );
            artistBox.setContent( currentTrack.user.username );
            fillTrackPage(currentTrack);
            commentBox.setContent('');

            screen.render();

        }; break;
    }

});

function timestampToTimeObject(timestamp) {
    // 123659 -> 2:
    var stringTimestamp = timestamp + '',
        timestampAsSeconds = stringTimestamp.substr(0, stringTimestamp.length - 3),
        minutes = timestampAsSeconds / 60 | 0, 
        seconds = timestampAsSeconds % 60;


    return {m: minutes, s: seconds > 9 ? seconds : '0' + seconds};
    
}

function formatComment(comment) {

    // var commentTimeimeObject = timestampToTimeObject(comment.timestamp),
        commentString =

            '{yellow-fg}' + 
            '☁ ' + 
            // commentTimeimeObject.m + ':' +
            // commentTimeimeObject.s + 
            comment.user.username + 
            ': {/yellow-fg}' + 
            comment.body;
    
    return commentString;
}

timeSub.on('message', function(timeString) {
    // console.log(time.toString());
    // rl.prompt();
    
    if (currentTrack === undefined) return;    
    
    var timestampString = timeString.toString().split(' ')[1],
        timeIndex = timestampString.substr(0, timestampString.length - 2),
        timeObject = timestampToTimeObject(timestampString),
        durationObject = timestampToTimeObject(currentTrack.duration);
    
    timeBox.setContent(timeObject.m + ':' + timeObject.s + 
                       '/' + 
                       durationObject.m + ':' + durationObject.s);

    var progressPersent =  (timestampString | 0) / (currentTrack.duration / 100);
    trackProgressBar.setProgress(progressPersent);

    if (currentTrack.comments[timeIndex] !== undefined) {
        currentTrack.comments[timeIndex].forEach(function(comment){

            commentBox.setContent(commentBox.content + '\n' + 
                                 formatComment(comment));
            
        });

        commentBox.setScrollPerc(100);

    } 

    screen.render();
});

var blessed = require('blessed');

// Create a screen object.
var screen = blessed.screen({
    fastCSR: true,
    useBCE: true,
});

var form = blessed.form({
    parent: screen,
    keys: true,
    width: '100%',
    height: '100%'

});


var pages = [];
form.on('resize', function (data) {
    
    pages.forEach(function (page) {
        page.height = form.height - 7;  // code dup
        page.setScrollPerc(100);
    });

    screen.render();
});

var promptBox = blessed.box({
    parent: form,
    shrink: true,
    keys: true,

    bottom: 0,
    left:0,
    content: '♪',
    width: 1,
    height: 1,

    name: 'prompt'
});
var commandTextbox = blessed.textbox({
    parent: form,
    shrink: true,
    keys: true,

    left: 2,
    bottom: 0,

    width: '100%',
    height: 1,

    name: 'command'
});



var titleBox = blessed.box({
    parent: form,
    top: 0,
    align: 'center',
    height: 1,
    width: "100%",

    style: {
        fg: 'yellow',
        bold: true
    }

    
});
var artistBox = blessed.box({
    parent: form,
    top: 1,
    width: "100%",
    height: 1,
    align: 'center',

    content: 'Artist here.',
    style: {
        fg: 'red'
    }

    
});
var timeBox = blessed.box({
    parent: form,
    top: 0,
    height: 1,
    left: 0,
    shrink: true,

    style: {
        bold: true
    }
    
});

var pageTitleBox = blessed.box({
    parent: form,
    
    width: '100%',
    bold: true,

    align: 'center',
    content: '1: Help \t 2: Playlist \t 3: Track Info \t 4: Comments',
    border: {
        ch: '-'
    },
    top: 2,
    height: 3

});

var pageOptions =  {
    parent: form,
    tags: true,
    scrollable: true, 

    width: '100%',
    content: "page",
    padding: {
        left: 1,
        right: 1
    },
    top: 5,
    height: form.height - 7
};

var commentBox = blessed.box(pageOptions),
    helpBox = blessed.box(pageOptions),
    trackBox = blessed.box(pageOptions),
    playlistBox = blessed.box(pageOptions);

commentBox.title = 'Comments';
helpBox.title = 'Help';
trackBox.title = 'Track info';
playlistBox.title = 'Playlist';

helpBox.setContent("this is help page.");
trackBox.setContent("this is track page.");
playlistBox.setContent("this is playlist page.");

pages.push(helpBox, playlistBox, trackBox, commentBox);

function fillTrackPage(track) {

    var durationObject = timestampToTimeObject(track.duration),
        trackInfo = 
            '{yellow-fg}{bold}Title:{/bold}{/yellow-fg} ' + track.title + '\n' + 
            '{yellow-fg}{bold}Artist:{/bold}{/yellow-fg} ' + track.user.username + '\n' + 
            '{yellow-fg}{bold}Genre:{/bold}{/yellow-fg} ' + track.genre + '\n' + 
            '{yellow-fg}{bold}Tags:{/bold}{/yellow-fg} ' + track.tag_list + '\n' + 
            '{yellow-fg}{bold}Uploaded:{/bold}{/yellow-fg} ' + track.created_at + '\n' + 
            '{yellow-fg}{bold}Duration:{/bold}{/yellow-fg} ' + durationObject.m + ':' + durationObject.s + '\n' + 
            '{yellow-fg}{bold}BMP:{/bold}{/yellow-fg} ' + (track.bmp || '') + '\n' + 
            '{yellow-fg}{bold}Comment count:{/bold}{/yellow-fg} ' + track.comment_count + 
            '{yellow-fg}{bold} Playback count:{/bold}{/yellow-fg} ' + track.playback_count + '\n' + 
            '{yellow-fg}{bold}Type:{/bold}{/yellow-fg} ' + (track.track_type || '') + '\n' + 
            '{yellow-fg}{bold}Page:{/bold}{/yellow-fg} ' + track.permalink_url + '\n' + 
            '{yellow-fg}{bold}Purchase URL:{/bold}{/yellow-fg} ' + (track.purchase_url || '') + '\n' + 
            '{yellow-fg}{bold}Download URL:{/bold}{/yellow-fg} ' + (track.download_url || '') + '\n' + 
            '{yellow-fg}{bold}Stream URL:{/bold}{/yellow-fg} ' + track.stream_url + '\n' + 
            '\n' + 
            '{yellow-fg}{bold}Description:{/bold}{/yellow-fg} '+ '\n' + track.description + '\n' ;


    trackBox.setContent(trackInfo);
}

var trackProgressBar = blessed.progressbar({
    parent: form,
    tags: true,
    // barFg: 'yellow',
    barBg: 'black',

    fg: 'black',
    padding: {
        left: 1,
        right: 1
    },
    bottom: 1,
    height: 1,
    filled: 0,
    ch: '.'
});

trackProgressBar.setProgress(100);

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
});
screen.key(['M-x'], function(ch, key) {
    commandTextbox.readInput();
});
screen.key(['M-x'], function(ch, key) {
    commandTextbox.readInput();
});

function showPage(pageToShow) {

    pages.forEach(function (page) {
        page.hidden = true;
    });
    
    pageToShow.hidden = false;
    pageTitleBox.setContent(pageToShow.title);
    screen.render();
}

screen.key(['1'],  function () { showPage(helpBox); });
screen.key(['2'],  function () { showPage(playlistBox); });
screen.key(['3'],  function () { showPage(trackBox); });
screen.key(['4'],  function () { showPage(commentBox); });

commandTextbox.key('enter', function() {

    var inputArray = commandTextbox.value.split(' '),
        command = inputArray[0], params = {};

    if (inputArray[1] !== undefined) {

        var param = inputArray[1].split(':');
        params[param[0]] = param[1];
    }

    var request = JSON.stringify({ name: command, params: params });

    rq.send(request);

    commandTextbox.clearValue();

    screen.render();
});

var getCurrentTrackRequest = JSON.stringify({ name: 'getCurrentTrack', params: {} });
rq.send(getCurrentTrackRequest);

screen.render();
