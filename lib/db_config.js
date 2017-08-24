var sync = require('node-sync').sync3;
var co = sync.proc;
var $let = sync.letImplicit;
var $get = sync.implicit;

var mysql = require('mysql');
var $U = require('underscore');
var uuid = require('uuid');

var Table = require('./table');
var DB = require('./db');
var Util = require('./util');


var getValue = function(o) {
    for (var k in o) {
        return o[k];
    }
};

var DBConfig = function() {
    this._init.apply(this, arguments);
};

DBConfig.prototype = {
    _init: function(cfg) {
        this._name = cfg.name;
        this._idFieldName = cfg.idFieldName || 'id';
        this._createdFieldName = cfg.createdFieldName || 'date_created';
        this._updatedFieldName = cfg.updatedFieldName || 'last_updated';

        this._versionFieldName = cfg.versionFieldName || 'version';
        this._softDeleteFieldName = cfg['softDeleteFieldName'] || 'is_deleted';

        this._supportOptimisticLock = cfg['_supportOptimisticLock'] === undefined ? true: cfg['_supportOptimisticLock'];
        this._supportSoftDelete = cfg['supportSoftDelete'] === undefined ? true: cfg['supportSoftDelete'];

        this._connection = cfg['connection'];
        this._connection['connectionLimit'] = 1;

        this._schema = {};
        this._prepared = false;

        this._models = {};
    },

    each: co(function*(list, afn) {
    	for (var i = 0; i < list.length; i++) {
    		yield afn(list[i]);
    	}
    }),

    _prepareModels: function() {
        var me = this;

        $U.each($U.keys(me._schema), function(name) {
            this._models[name] = new Table({
                name: name,
                db: me
            });
        });
    },

    getModel: function(name) {
        return this._models[name];
    },

    getDB: function(cfg) {
        return new DB({
            'db': this,
            'connection': cfg
        });
    },

    executeQuery: Util.executeQuery,

    format: Util.format,

    ready: co(function*() {
        var me = this;

        if (this._prepared) {
            return;
        }        

        try {
        	var pool = mysql.createPool(me._connection);
            var conn = yield sync.tame(pool.getConnection, pool)();

            var tables = yield sync.tame(conn.query, conn)('show tables');

            yield me.each(tables, co(function*(table) {
                var tableName = getValue(table);
                var columns = yield sync.tame(conn.query, conn)('desc ' + tableName);
                me._schema[tableName] = $U.map(columns, function(column) {
                    return column['Field'];
                });
            }));
            me._prepareModels();
            me._prepared = true;
        } finally {
            conn.release();
            me._pool.end();
        }
    })
};

module.exports = DBConfig;


