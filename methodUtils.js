var request = require('request');
var util = require('util');

exports.baseUrl = 'https://api.flock.co/v1';

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
        url: exports.baseUrl + '/' + name,
        method: 'POST',
        form: parameters
    };
    request(options, function (error, response, body) {
        if (callback) {
            if (!error) {
                var json = null;
                var error = null;
                var statusCode = response.statusCode;
                var headers = response.headers;
                var contentType = headers['content-type'];
                if (contentType) {
                    if (contentType.split(';')[0] === 'application/json') {
                        try {
                            json = JSON.parse(body);
                        } catch (jsonError) {
                            error = new UnexpectedResponseError(statusCode, headers, body, jsonError);
                        }
                    } else {
                        error = new UnexpectedResponseError(statusCode, headers, body, null);
                    }
                }
                if (error) {
                    callback(error);
                } else if (statusCode === 200) {
                    callback(null, json);
                } else {
                    callback(new MethodError(statusCode, headers, json));
                }
            } else {
                callback(error);
            }
        }
    });
};


var MethodError = exports.MethodError = function (statusCode, headers, body) {
    this.name = 'MethodError';
    this.message = body.description;
    this.statusCode = statusCode;
    this.headers = headers;
    this.errorCode = body.error;
    delete body.error;
    delete body.description;
    this.additionalAttributes = body;
    this.stack = (new Error()).stack;
};
util.inherits(MethodError, Error);

var UnexpectedResponseError = exports.UnexpectedResponseError = function (statusCode, headers, body, underlyingError) {
    this.name = 'UnexpectedResponseError';
    this.message = underlyingError ? underlyingError.message : 'method call received an unexpected response';
    this.statusCode = statusCode;
    this.headers = headers;
    this.body = body;
    this.underlyingError = underlyingError;
    this.stack = (new Error()).stack;
};
util.inherits(UnexpectedResponseError, Error);