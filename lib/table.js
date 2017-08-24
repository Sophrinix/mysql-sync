var sync = require('node-sync').sync3;
var co = sync.proc;
var $let = sync.letImplicit;
var $get = sync.implicit;
var $U = require('underscore');

var DB = require('./db');

var Table = function(cfg) {
        this._name = cfg.name;
        this._idFieldName = cfg.idFieldName || 'id';
        this._versionFieldName = cfg.versionFieldName || 'version';
        this._createdFieldName = cfg.createdFieldName || 'date_created';
        this._updatedFieldName = cfg.updatedFieldName || 'last_updated';

        // this._rowClass = cfg['rowClass'];
        this._schema = cfg['schema'];
    };

Table.prototype = {
    getName: function() {
        return this._name;
    },

    getIdFieldName: function() {
        return this._idFieldName;
    },

    getVersionFieldName: function() {
        return this._versionFieldName;
    },

    getCreatedFieldName: function() {
        return this._createdFieldName;
    },

    getUpdatedFieldName: function() {
        return this._updatedFieldName;
    },

    _hasUpdatableField: function(field) {
        if (field == this.getIdFieldName() ||
            field == this.getCreatedFieldName() || 
            field == this.getUpdatedFieldName()
            ) {
            return false;
        }

        return $U.contains(this._schema, field);
    },

    _refineDto: function(dto, autoId) {
        autoId = (autoId === undefined)? true: autoId;
        var res = {};
        
        $U.each(this._schema, function(field) {
            if (dto[field]) {
                res[field] = dto[field];
            }            
        });

        if (autoId) {
            delete res[this.getIdFieldName()];
        }

        return res;
    },

    _refineDtoForCreate: function(dto) {
        var res = this._refineDto(dto);

        var d = new Date();
        res[this.getCreatedFieldName()] = d;
        res[this.getUpdatedFieldName()] = d;
        res[this.getVersionFieldName()] = 0;

        return res;
    },

    _getConnection: co(function*() {
        var db = yield $get(DB['db_key']);
        var conn = yield db._getConnection();
        return conn;
    }),

    create: co(function*(dto) {
        dto = this._refineDtoForCreate(dto);
        return yield this._create(dto);
    }),

    _create: co(function*(dto) {
        var me = this;

        var l = [
            ' insert into ' + this.getName() + ' set '
        ];

        var first = true;

        $U.each(dto, function(v, k) {
            if (first) {
                first = false;
            } else {
                l.push(', ');
            }
            l.push(
                ' ', k, ' = ', conn.escape(v)
            );
        });

        l.push(' ; ');

        var q = l.join('');

        // console.log(q);

        var conn = yield this._getConnection();
        var res = yield sync.tame(conn.query, conn)(q);
        return res['insertId'];
    }),

    clone: co(function*(dto) {
        dto = this._refineDto(dto, false);
        return (yield this._create(dto));
    },

    _refineDtoForUpdate: function(dto) {
        var res = {};

        for (var k in dto) {
            if (this._hasUpdatableField(k)) {
                res[k] = dto[k];
            }
        }

        var d = new Date();
        res[this.getUpdatedFieldName()] = d;

        return res;
    } 

    _update: co(function*(id, dto, conditions) {
        var me = this;

        // dto[this._table.getUpdatedFieldName()] = new Date();
        dto = this._refineDtoForUpdate(dto);

        var l = [
            ' update ', this.getName(), ' set '
        ];

        var first = true;
        for (var k in dto) {
            var v = dto[k];
            if (first) {
                first = false;
            } else {
                l.push(', ');
            }
            l.push(
                ' ', k, ' = ', conn.escape(v)
            );
        }

        l.push(
            ' where ', this._table.getIdFieldName(), ' = ', id
        );

        if (conditions) {
            l.push(
                ' and ', conditions
            );
        }

        l.push(' ; ');

        var q = l.join('');

        // console.log(q);
        var conn = yield this._getConnection();
        var res = yield sync.tame(conn.query, conn)(q);
        return res;
    }),

    baseQuery: function(str, bindings) {
        var q = ' select * from ' + this.getName() + ' ';
        var further;

        if (str != null) {
            if (bindings == null) {
                further = str;
            } else {
                further = DB.format(str, bindings);
            }
        }

        if (further != null) {
            q += further;
        }
        return q;
    },

    findById: function(conn, id, cb) {
        var me = this;

        cps.seq([
            function(_, cb) {
                me.find(conn, me.baseQuery('where ' + me.getIdFieldName() + ' = ? ', [id]), cb);
            },
            function(res) {
                cb(null, res[0])
            }
        ], cb);
    },

    lockById: function(conn, id, cb) {
        var me = this;

        cps.seq([
            function(_, cb) {
                me.find(conn, me.baseQuery('where ' + me.getIdFieldName() + ' = ? for update', [id]), cb);
            },
            function(res) {
                cb(null, res[0])
            }
        ], cb);
    },

    findAll: function(conn, cb) {
        this.find(conn, this.baseQuery(), cb);
    },

    find: function(conn, q, cb) {
        var me = this;

        cps.seq([
            function(_, cb) {
                conn.query(q, cb);
            },
            function(res, cb) {
                cb(null, $U.map(res, function(o) {
                    return new me._rowClass(o);
                }));
            }
        ], cb);
    },

    linksTo: function(cfg) {
        this._linksToMap[cfg.name] = {
            table: cfg.table,
            key: cfg.key
        };
        return this;
    },

    linkedBy: function(cfg) {
        this._linkedByMap[cfg.name] = {
            table: cfg.table,
            key: cfg.key
        };
        return this;
    },

    relatesTo: function(cfg) {
        this._relatesToMap[cfg.name] = {
            table: cfg.table,
            through: cfg.through,
            leftKey: cfg.leftKey,
            rightKey: cfg.rightKey
        };
        return this;
    },

    _lookupLinksToMap: function(name) {
        var cfg = this._linksToMap[name];
        if (cfg) {
            cfg.name = name;
        }
        return cfg;
    },

    _lookupLinkedByMap: function(name) {
        var cfg = this._linkedByMap[name];
        if (cfg) {
            cfg.name = name;
        }
        return cfg;
    },

    _lookupRelatesToMap: function(name) {
        var cfg = this._relatesToMap[name];
        if (cfg) {
            cfg.name = name;
        }
        return cfg;
    },

    findFirst: function(conn, q, cb) {
        var me = this;

        cps.seq([
            function(_, cb) {
                me.find(conn, q, cb);
            },
            function(res, cb) {
                cb(null, res[0]);
            }
        ], cb);
    }
};

module.exports = Table;
