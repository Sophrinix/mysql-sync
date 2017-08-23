var sync = require('node-sync').sync3;
var co = sync.proc;
var $let = sync.letImplicit;
var $get = sync.implicit;

var mysql = require('mysql');
var $U = require('underscore');
var uuid = require('uuid');

var getValue = function(o) {
    for (var k in o) {
        return o[k];
    }
};


var DB = function(cfg) {
    this._cfg = cfg;
    this._pool = mysql.createPool(this._cfg);
    this._txnKey = 'txn_key_' + uuid.v4();
    this._schema = {};
    this._prepared = false;
};

DB.prototype = {
    _getConnection: co(function*() {
        var me = this;

        var txnConn = yield $get(me._txnKey);
        if (txnConn) {
            return yield txnConn;
        }
        return (yield sync.tame(me._pool.getConnection, me._pool)());
    }),

    _prepare: co(function*() {
        var me = this;

        if (this._prepared) {
            return;
        }

        try {
            var conn = yield sync.tame(me._pool.getConnection, me._pool)();

            var tables = yield sync.tame(conn.query, conn)('show tables');
            $u.each(tables, function(table) {
                var tableName = getValue(table);
                var columns = yield sync.tame(conn.query, conn)('desc ' + tableName);
                me._schema[tableName] = $U.map(columns, function(column) {
                    return column['Field'];
                });
                me._prepared = true;
            });
        } finally {
            conn.release();
        }
    }),

    transaction: co(function*(afn) {
        var me = this;

        yield me._prepare();

        var txnConn = yield $get(me._txnKey);
        if (txnConn) {
            return yield afn();
        }

        var txnConn = yield sync.tame(me._pool.getConnection, me._pool)();

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

module.exports = DB;
