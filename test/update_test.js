var sync = require('node-sync').sync4;
var co = sync.co;
var $let = sync.letImplicit;
var $get = sync.implicit;
var lift = sync.lift;

var $U = require('underscore');

var setup = require('./setup');

setup(co(function*(db, $M) {
    return (yield* $M('users').update({'id': 2}, {
        'first_name': 'Micky'
    }));
}));
