var sync = require('node-sync').sync3;
var co = sync.proc;
var $let = sync.letImplicit;
var $get = sync.implicit;
var lift = sync.lift;
var parallel = sync.parallel;

var $U = require('underscore');

var setup = require('./setup');

setup(co(function*(db, $M) {
    var User = $M('users');

    var sleep = co(function*(time) {
        yield function(e, s, cb) {
            setTimeout(function() {
                cb(s);
            }, time);
        };
    });

    var update = co(function*(time, s) {
        return yield db.transaction(co(function*() {
            console.log('here1', s);
            var row = yield User.lockById(2);
            console.log('here2', s);
            yield sleep(time);
            console.log('here3', s);
            if (row) {
                var newEmail = row['email'] || '';
                newEmail = newEmail + s;
                yield User.update(row, {
                    'email': newEmail
                });
                console.log('here4', s);
            }
        }));
    });

    var txn = co(function*() {
        yield User.update({id: 2}, {email: 'foobar'});

        return yield parallel([
            update(2000, 'aaa'),
            update(1000, 'bbb')
        ]);
    });

    return yield txn();
}));
