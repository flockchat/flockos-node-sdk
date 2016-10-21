# FlockOS SDK for node.js

## Installation

```
npm install flockchat/flockos-node-sdk
```

## Usage

First, `require` the module, then set your app id and app secret.

```js
var flock = require('flockos');

flock.setAppId('<app id>');
flock.setAppSecret('<app secret>');
```

To verify [event tokens][], you can either use the `verifyEventToken` function (this only works if have set the app secret):

```js
flock.verifyEventToken(token);
```

Or, if you use [express][], we provide a convenient middleware to automatically verify all event tokens, whether they are sent to the event listener URL or a widget or browser URL:

```js
var app = express();
app.use(flock.eventTokenChecker);
```

To handle [events][] an express router is provided. If you use this, you can listen for all incoming events on `flock.events`.

```js
app.post('/events', flock.router);

flock.events.on('client.slashCommand', function (event) {
    return {
        text: 'Got: ' + event.text
    }
});
```

To call a [method][methods], use `flock.callMethod`.

```js
flock.callMethod('chat.sendMessage', userToken, {
    message: {
        to: 'u:wufu4udrcewerudu',
        text: 'hello'
    }
}, function (response) {
    console.log(response);
});
```

[methods]: http://docs.flock.co/display/flockos/Methods
[events]: http://docs.flock.co/display/flockos/Events
[event tokens]: http://docs.flock.co/display/flockos/Event+Tokens
[express]: http://expressjs.com/
