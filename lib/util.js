var sync = require('node-sync').sync3;
var co = sync.proc;
var $let = sync.letImplicit;
var $get = sync.implicit;
var lift = sync.lift;

var uuid = require('uuid');
var mysql = require('mysql');

var format = function(str, bindings) {
    var l = str.split('?');

    if (l.length - 1 != bindings.length) {
        throw new Error('sql string format error');
    }

    var res = [];

    for (var i = 0; i < bindings.length; i++) {
        res.push(l[i]);
        res.push(mysql.escape(bindings[i]));
    }

    res.push(l[l.length - 1]);

    return res.join(' ');
};

var executeQuery = co(function*(q) {
    var db = yield $get(dbKey);
    var conn = yield db._getConnection();
    var res = yield lift(conn.query, conn)(q);
    return res;
});

var transaction = co(function*(afn) {
    var db = yield $get(dbKey);
    yield db.transaction(afn);
});

var dbKey = 'db_key_' + uuid.v4();

var checkDBContext = co(function*(dbCfg) {
    var db = yield $get(dbKey);
    return db._db == dbCfg;
});

module.exports = {
    'format': format,
    'executeQuery': executeQuery,
    'db_key': dbKey,
    'checkDBContext': checkDBContext,
    'transaction': transaction
};
