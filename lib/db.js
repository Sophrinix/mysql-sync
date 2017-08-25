var sync = require('node-sync').sync3;
var co = sync.proc;
var $let = sync.letImplicit;
var $get = sync.implicit;
var lift = sync.lift;

var mysql = require('mysql');
var $U = require('underscore');
var uuid = require('uuid');

var Util = require('./util');



var DB = function() {
    this._init.apply(this, arguments);
};

DB.prototype = {
    _init: function(cfg) {
        this._db = cfg['db'];

        var poolConfig = $U.extend(this._db._connection, cfg['connection']);
        this._pool = mysql.createPool(poolConfig);

        this._txnKey = 'txn_key_' + uuid.v4();
    },

    _getConnection: co(function*() {
        var me = this;

        var txnConn = yield $get(me._txnKey);
        if (txnConn) {
            return txnConn;
        }
        return (yield lift(me._pool.getConnection, me._pool)());
    }),

    transaction: co(function*(afn) {
        var me = this;

        var txnConn = yield $get(me._txnKey);
        if (txnConn) {
            return yield afn();
        }

        txnConn = yield lift(me._pool.getConnection, me._pool)();

        try {
            yield lift(txnConn.query, txnConn)('start transaction');
            var env = {};
            env[me._txnKey] = txnConn;
            var res = yield $let(env, afn());
            yield lift(txnConn.query, txnConn)('commit');
            return res;
        } catch(e) {
            yield lift(txnConn.query, txnConn)('rollback');
            throw e;
        } finally {
            txnConn.release();
        }
    }),

    context: co(function*(afn) {
        var env = {};
        env[Util['db_key']] = this;

        var res = yield $let(env, afn());
        return res;
    }),

    cursor: co(function*(q, afn) {
        var me = this;

        try {
            var conn = yield lift(me._pool.getConnection, me._pool)();

            var cursor = new Cursor(conn, q);

            while (true) {
                var row = yield lift(cursor.next, cursor)();
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


module.exports = DB;
