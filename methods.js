var methodUtils = require('./methodUtils');
// methods
 
var channels = exports.channels = {}; 
var chat = exports.chat = {}; 
var roster = exports.roster = {}; 
var users = exports.users = {};  

var createMethod = function (name) {
    var parts = name.split('.');
    var namespace = parts[0];
    var unqualifiedName = parts[1];
    exports[namespace][unqualifiedName] = function (token, parameters, callback) {
        methodUtils.callMethod(name, token, parameters, callback);
    };
};

createMethod('channels.getInfo');
createMethod('channels.list');
createMethod('channels.listMembers');
createMethod('chat.fetchMessages');
createMethod('chat.sendMessage');
createMethod('roster.listContacts');
createMethod('users.getInfo');
createMethod('users.getPublicProfile');
