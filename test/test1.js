var DBCfg = require('../lib/db_config');

var main = co(function*() {
    var dbCfg = new DBCfg(cfg);

    yield dbCfg.ready();
    var db = dbCfg.getDB({
        'connectionLimit': 1
    });
    var $M = dbCfg.getModel;

    db.context(co(function*() {
        yield $M('users').create(dto);
    }));
});