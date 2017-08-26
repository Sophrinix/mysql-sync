var sync = require('node-sync').sync3;
var co = sync.proc;
var $let = sync.letImplicit;
var $get = sync.implicit;
var lift = sync.lift;
var parallel = sync.parallel;

var $U = require('underscore');

var setup = require('./setup');

setup(co(function*(db, $M) {
    var newUser = yield $M('users').create({
        'first_name': 'Danny',
        'last_name': 'Tag',
        'gender': 'F',
        'date_of_birth': new Date(),
        'email': ''
    });

    return newUser;
}));
