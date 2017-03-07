var methodUtils = require('./methodUtils');
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
        methodUtils.callMethod(name, token, parameters, callback);
    };
};

createMethod('chat.fetchMessages');
createMethod('chat.sendMessage');
createMethod('groups.getInfo');
createMethod('groups.getMembers');
createMethod('groups.list');
createMethod('roster.listContacts');
createMethod('users.getInfo');
createMethod('users.getPublicProfile');
