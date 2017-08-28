var sync = require('node-sync').sync4;
var co = sync.co;
var $let = sync.letImplicit;
var $get = sync.implicit;
var lift = sync.lift;
var parallel = sync.parallel;

var $U = require('underscore');

var setup = require('./setup');

setup(co(function*(db, $M) {
    return yield* $M('users').remove(4);
}));
