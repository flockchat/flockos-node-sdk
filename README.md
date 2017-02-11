# FlockOS SDK for node.js

## Installation

```
npm install flockos
```

## Usage

First, `require` the module, then set your app id and app secret.

```js
var flock = require('flockos');

flock.appId = '<app id>';
flock.appSecret = '<app secret>';
```

To verify [event tokens][], you can either use `flock.events.verifyToken`:

```js
flock.events.verifyToken(token);
```

Or, if you use [express][], we provide a convenient middleware to automatically verify all event tokens, whether they are sent to the event listener URL or a widget or browser URL:

```js
var app = express();
app.use(flock.events.tokenVerifier);
```

To handle [events][] an express router is provided. If you use this, you can listen for all incoming events on `flock.events`.

```js
app.post('/events', flock.events.listener);

flock.events.on('client.slashCommand', function (event, callback) {
    // handle slash command event here
    ...
    // invoke the callback to send a response to the event
    callback(null, { text: 'Received your command' });
});
```

To call a [method][methods], use `flock.callMethod`.

```js
flock.callMethod('chat.sendMessage', token, {
    to: 'u:wufu4udrcewerudu',
    text: 'hello'
}, function (error, response) {
    if (!error) {
        console.log(response);
    }
});
```

[methods]: http://docs.flock.co/display/flockos/Methods
[events]: http://docs.flock.co/display/flockos/Events
[event tokens]: http://docs.flock.co/display/flockos/Event+Tokens
[express]: http://expressjs.com/
