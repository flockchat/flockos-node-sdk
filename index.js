var EventEmitter = require('events');
var express = require('express');
var jwt = require('jsonwebtoken');
var methods = require('./methods');
var methodUtils = require('./methodUtils');

exports.appId = null;
exports.appSecret = null;

var events = new EventEmitter();

// standalone function to verify event tokens
events.verifyToken = function (token, userId) {
    var payload = null;
    try {
        payload = jwt.verify(token, exports.appSecret);
    } catch (e) {
        console.warn('Got error while verifying token: ' + e);
    }
    if (payload) {
        if (!(payload.appId && payload.appId === exports.appId)) {
            return null;
        }
        if (userId && !(payload.userId && payload.userId === userId)) {
            return null;
        }
    }
    return payload;
};

// express middleware to verify event tokens
// works for events sent to event listener, and widget/browser URLs
events.tokenVerifier = function (req, res, next) {
    // if res.locals.eventTokenPayload exists, we've already run the
    // token verifier, no need to run it again
    if (!res.locals.eventTokenPayload) {
        var token = req.get('x-flock-event-token') || req.query.flockEventToken;
        if (token) {
            // if userId is given, include it for verification
            var userId = null;
            if (req.is('application/json') && req.body) {
                userId = req.body.userId;
            } else if (req.query.flockEvent) {
                try {
                    var event = JSON.parse(req.query.flockEvent);
                    userId = event.userId;
                } catch (e) {
                    //console.warn('Couldn't parse flockEvent query param');
                }
            }
            var payload = events.verifyToken(token, userId);
            if (!payload) {
                console.warn('Invalid event token', token);
                res.sendStatus(403);
                return;
            }
            res.locals.eventTokenPayload = payload;
        }
    }
    next();
};

// express middleware that listens for events sent to the event listener URL
// use events.on() to listen for events in your application
events.listener = express.Router();
events.listener.use(require('body-parser').json());
events.listener.use(events.tokenVerifier);
events.responseTimeout = 60 * 1000;
events.listener.use(function (req, res, next) {
    console.log('received request: ', req.method, req.url, req.headers);
    console.log('received event: %j', req.body);
    var event = req.body;
    var responded = false;
    var timeoutID = null;
    events.listeners(event.name).forEach(function (listener) {
        try {
            listener(event, function (error, body) {
                if (responded) {
                    console.warn('(%s) Only one listener can respond to an event', event.name);
                    return;
                }
                responded = true;
                if (timeoutID) {
                    clearTimeout(timeoutID);
                }
                if (error) {
                    var statusCode = error.statusCode || 400;
                    res.status(statusCode).send({ error: error.name,
                                                  description: error.message });
                } else if (body && typeof body === 'object' || typeof body === 'string') {
                    res.send(body);
                } else {
                    res.send({});
                }
            });
        } catch (e) {
            console.warn('(%s) Got an error in event listener', event.name, e);
        }
    });
    // respond to an event after events.responseTimeout if none of the
    // listeners do by then
    if (!responded) {
        timeoutID = setTimeout(function () {
            res.send({});
        }, events.responseTimeout);
    }
});

Object.defineProperty(exports, 'baseUrl', {
    set: function(value) {
        methodUtils.baseUrl = value;
    },
    get: function() {
        return methodUtils.baseUrl;
    }
});

exports.events = events;

Object.assign(exports, methods, methodUtils);
