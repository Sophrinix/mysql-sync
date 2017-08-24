var sync = require('node-sync').sync3;
var co = sync.proc;
var $let = sync.letImplicit;
var $get = sync.implicit;

var mysql = require('mysql');
var $U = require('underscore');
var uuid = require('uuid');

var format = function(str, bindings) {
    var l = str.split('?')

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
    var db = yield $get(DB['db_key']);
    var conn = yield db._getConnection();
    var res = yield sync.tame(conn.query, conn)(q);
    return res;
});


var DB = function() {
    this._init.apply(this, arguments);
};

DB.prototype = {
    _init: function(cfg) {
        this._db = cfg['db'];

        var poolConfig = $U.extend(this.db._connection, cfg['connection']);
        this._pool = mysql.createPool(poolConfig);

        this._txnKey = 'txn_key_' + uuid.v4();
    },

    _getConnection: co(function*() {
        var me = this;

        var txnConn = yield $get(me._txnKey);
        if (txnConn) {
            return yield txnConn;
        }
        return (yield sync.tame(me._pool.getConnection, me._pool)());
    }),

    transaction: co(function*(afn) {
        var me = this;

        var txnConn = yield $get(me._txnKey);
        if (txnConn) {
            return yield afn();
        }

        txnConn = yield sync.tame(me._pool.getConnection, me._pool)();

        try {
            yield sync.tame(txnConn.query, txnConn)('start transaction');
            var env = {};
            env[me._txnKey] = txnConn;
            var res = yield $let(env, afn());
            yield sync.tame(txnConn.query, txnConn)('commit');
            return res;
        } catch(e) {
            yield sync.tame(txnConn.query, txnConn)('rollback');
        } finally {
            txnConn.release();
        }
    }),

    context: co(function*(afn) {
        var env = {};
        env[DB['db_key']] = this;

        var res = yield $let(env, afn());
        return res;
    }),

    cursor: co(function*(q, afn) {
        var me = this;

        try {
            var conn = yield sync.tame(me._pool.getConnection, me._pool)();

            var cursor = new Cursor(conn, q);

            while (true) {
                var row = yield sync.tame(cursor.next, cursor)();
                if (!row) {
                    break;
                } else {
                    yield afn(row);
                }
            }
        } finally {
            conn.release();
        }
    }),

    end: function() {
        this._pool.end();
    }
};

DB['db_key'] = 'db_key_' + uuid.v4();
DB.executeQuery = executeQuery;
DB.format = format;

module.exports = DB;
