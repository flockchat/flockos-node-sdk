var EventEmitter = require('events');
var express = require('express');
var jwt = require('jsonwebtoken');
var request = require('request');

var app = {
    id: null,
    secret: null
};

exports.setAppId = function (appId) {
    app.id = appId;
};

exports.setAppSecret = function (appSecret) {
    app.secret = appSecret;
};

var methodsBaseUrl = 'https://api.flock.co/v1';

exports.setMethodsBaseUrl = function (url) {
    methodsBaseUrl = url;
};

var events = new EventEmitter();

// standalone function to verify event tokens
events.verifyToken = function (token) {
    var payload = null;
    try {
        payload = jwt.verify(token, app.secret);
    } catch (e) {
        if (e instanceof jwt.JsonWebTokenError) {
            console.log('Got error while verifying token: ' + e);
        } else {
            throw e;
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
            var payload = events.verifyToken(token);
            if (!payload) {
                console.log('Invalid event token', token);
                res.sendStatus(403);
                return;
            }
            res.locals.eventTokenPayload = payload;
            console.log('Event token payload', payload);
        }
    }
    next();
};

// express middleware that listens for events sent to the event listener URL
// use events.on() to listen for events in your application
events.listener = express.Router();
events.listener.use(require('body-parser').json());
events.listener.use(events.tokenVerifier);
events.listener.use(function (req, res, next) {
    console.log('received request: ', req.method, req.url, req.headers);
    console.log('received event: %j', req.body);
    var event = req.body;
    var userId = event.userId;
    if (userId !== res.locals.eventTokenPayload.userId) {
        console.log('userId in event doesn\'t match the one in event token');
        res.sendStatus(403);
        return;
    }
    var responded = false;
    events.listeners(event.name).forEach(function (listener) {
        var body = listener(event, res.locals.eventTokenPayload);
        if (!responded) {
            if (typeof body === 'function') {
                body(function (body) {
                    res.send(body);
                });
                responded = true;
            } else if (typeof body === 'object') {
                res.send(body);
                responded = true;
            }
        }
    });
    if (!responded) {
        res.send({});
    }
});

exports.events = events;

var MethodError = exports.MethodError = function (statusCode, headers, body) {
    this.statusCode = statusCode;
    this.headers = headers;
    this.errorCode = body.error;
    this.description = body.description;
    delete body.error;
    delete body.description;
    this.parameters = body;
};

var UnexpectedResponseError = exports.UnexpectedResponseError = function (statusCode, headers, body) {
    this.statusCode = statusCode;
    this.headers = headers;
    this.body = body;
};

// calls a Flock method
var callMethod = exports.callMethod = function (name, token, parameters, callback) {
    parameters = parameters || {};
    parameters.token = token;
    // stringify nested objects
    Object.keys(parameters).forEach(function (key) {
        var value = parameters[key];
        if (typeof value === 'object') {
            parameters[key] = JSON.stringify(value);
        }
    });
    var options = {
        url: methodsBaseUrl + '/' + name,
        method: 'POST',
        form: parameters
    };
    request(options, function (error, response, body) {
        if (callback) {
            var statusCode = response.statusCode;
            var headers = response.headers;
            var json = null;
            if (!error) {
                var contentType = headers['content-type'];
                if (contentType && contentType.split(';')[0] === 'application/json') {
                    json = JSON.parse(body);
                }
                if (statusCode === 200) {
                    callback(null, json);
                } else {
                    if (json) {
                        callback(new MethodError(statusCode, headers, json));
                    } else {
                        callback(new UnexpectedResponseError(statusCode, headers, body));
                    }
                }
            } else {
                callback(error);
            }
        }
    });
};

// methods

var chat = exports.chat = {};
var groups = exports.groups = {};
var roster = exports.roster = {};
var users = exports.users = {};

var createMethod = function (name) {
    var parts = name.split('.');
    var namespace = parts[0];
    var unqualifiedName = parts[1];
    exports[namespace][unqualifiedName] = function (token, parameters, callback) {
        callMethod(name, token, parameters, callback);
    };
};

createMethod('chat.sendMessage');
createMethod('groups.getInfo');
createMethod('groups.getMembers');
createMethod('groups.list');
createMethod('roster.listContacts');
createMethod('users.getInfo');
