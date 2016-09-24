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

var jwt = require('jsonwebtoken');
var verifyEventToken = exports.verifyEventToken = function (token) {
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

exports.eventTokenChecker = function (req, res, next) {
    var token = req.get('x-flock-event-token') || req.query.flockEventToken;
    if (token) {
        var payload = verifyEventToken(token);
        if (!payload) {
            console.log('Invalid event token', token);
            res.sendStatus(403);
            return;
        }
        res.locals.eventTokenPayload = payload;
        console.log('Event token payload', payload);
    }
    next();
};

var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
router.use(bodyParser.json());

var EventEmitter = require('events');
var events = new EventEmitter();

router.use(function (req, res, next) {
    console.log('received request: ', req.method, req.url, req.headers);
    console.log('received event: %j', req.body);
    var event = req.body;
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
        res.sendStatus(200);
    }
});

exports.router = router;
exports.events = events;

var request = require('request');
var METHODS_BASE_URL = 'https://api.flock.co/v1/';

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

exports.callMethod = function (name, token, parameters, callback) {
    parameters = parameters || {};
    parameters.token = token;
    var options = {
        url: METHODS_BASE_URL + name,
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
