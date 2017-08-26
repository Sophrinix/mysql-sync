var sync = require('node-sync').sync3;
var co = sync.proc;
var $let = sync.letImplicit;
var $get = sync.implicit;
var lift = sync.lift;
var parallel = sync.parallel;

var $U = require('underscore');

var setup = require('./setup');

setup(co(function*(db, $M) {
    return (yield $M('users').update({'id': 2}, {
        'first_name': 'McKay'
    }));
}));
