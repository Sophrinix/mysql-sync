var sync = require('node-sync').sync3;
var co = sync.proc;
var $let = sync.letImplicit;
var $get = sync.implicit;
var lift = sync.lift;

var $U = require('underscore');

var qoop = require('qoop');

var DBCfg = require('../lib/db_config');

var cfg = {
    host     : 'localhost',
    user     : 'root',
    password : 'root',
    database : 'reporter'
};

var $M;
var prepare = co(function*() {
    var dbCfg = new DBCfg({
        'createdFieldName': 'creationdate',
        'updatedFieldName': 'modificationdate',
        'supportSoftDelete': false,
        'supportOptimisticLock': false,
        'connection': cfg
    });

    yield dbCfg.ready();
    var db = dbCfg.getDB({
        'connectionLimit': 1
    });
    $M = function(name) {return dbCfg.getModel(name);};
    return db;
});

var run = co(function*() {
    try {
        var db = yield prepare();
        return (yield db.context(main));
    } finally {
        db.end();
    }
});

var main = co(function*() {
    return yield txn();
});

var createUser = co(function*() {
    var newUser = yield $M('User').create({
        'email': 'foo@bar.com',
        'handle': 'foobar',
        'phone': '12345'
    });

    return newUser;
});

var updateUser = co(function*() {
    return yield $M('User').update({'id': 8}, {
        'phone': '23456'
    });
});

var removeUser = co(function*() {
    return yield $M('User').remove(9);
});

var sleep = co(function*(time) {
    yield function(e, s, cb) {
        setTimeout(function() {
            cb(s);
        }, time);
    };
});

var txn = co(function*(time, s) {
    var User = $M('User');

    yield DBCfg.transaction(co(function*() {
        var row = yield User.lockById(8);
        yield sleep(time);
        if (row) {
            yield User.update(row, {
                'email': row['email'] + s
            });
        }
    }));
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