var blessed = require('blessed');

// Create a screen object.
var screen = blessed.screen();

var form = blessed.form({
    parent: screen,
    keys: true,
    width: '100%',
    height: '100%'


});

var commandTextbox = blessed.textbox({
    parent: form,
    shrink: true,
    keys: true,

    padding: {
        left: 1,
        right: 1
    },

    bottom: 0,

    width: '100%',
    height: 3,

    name: 'command'
});

var outputBox = blessed.box({
    parent: form,
    tags: true,
    width: '100%',
    padding: {
        left: 1,
        right: 1
    },
    top: 0,
    height: form.height - 4
});

var trackProgressBar = blessed.progressbar({
    parent: form,
    tags: true,
    barFg: 'white',
    barBg: 'magenta',

    padding: {
        left: 1,
        right: 1
    },
    bottom: 4,
    height: 1,
    filled: 0,
    ch: '='
});

trackProgressBar.setProgress(0);
function incPb(){

    trackProgressBar.progress( 10);
    if (trackProgressBar.value >= 100 ) trackProgressBar.setProgress(0);
    screen.render();

    setTimeout(incPb,1000);
}

incPb();

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
});
screen.key(['M-x'], function(ch, key) {
    commandTextbox.readInput();
});

commandTextbox.key('enter', function(){
    outputBox.setContent(outputBox.content + "\n" + commandTextbox.value);
    commandTextbox.clearValue();

    screen.render();
});
// Focus our element.


// Render the screen.
screen.render();
