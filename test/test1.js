var sync = require('node-sync').sync3;
var co = sync.proc;
var $let = sync.letImplicit;
var $get = sync.implicit;
var lift = sync.lift;

var $U = require('underscore');

var qoop = require('qoop');

var DBCfg = require('../lib/db_config');

var cfg = {

};

var $M;
var prepare = co(function*() {
    var dbCfg = new DBCfg(cfg);

    yield dbCfg.ready();
    var db = dbCfg.getDB({
        'connectionLimit': 1
    });
    $M = dbCfg.getModel;
    return db;
});

var run = co(function*() {
	var cb = yield prepare();

    yield db.context(yield main());
});

var main = co(function*() {
	var dto = {

	};

	yield $M('users').create(dto);
});

run()({}, {}, function(s, err, res) {
	if (err) {
		console.log('Error:', err);
		if (err.stack) {
			console.log(err.stack);
		}
	} else {
		console.log('Ok:', res);
	}
});