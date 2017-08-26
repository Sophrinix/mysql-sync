var cls = Class().extend(superClass).methods({

}).statics({

}).done();

var Class = function() {
	this._init.apply(this, arguments);
};

Class.prototype = {
	_init: function() {
		this._superClass = null;
		this._methodDefs = {};
		this._staticDefs = {};
	},

	extend: function(superClass) {
		this._superClass =superClass;
	},

	methods: function(defs) {
		this._methodDefs = defs;
	},

	statics: function(defs) {
		this._staticDefs = defs;
	},

	done: function() {
		var cls = function() {
			this._init.apply(this, arguments);
		};

		if (this._superClass) {
			cls.prototype = Object.create(this._superClass.prototype);
			cls.statics = Object.create(this._superClass.statics);
		} else {
			cls.prototype = {};
			cla.statics = {};
		}

		cls.prototype.superClass = this._superClass;
		cls.prototype.class = cls;
		cls.prototype.sup = function(method) {
			this._superClass.prototype[method].apply(this)
		};

		$U.extend(cls.prototype, this._methodDefs);
		$U.extend(cls.statics, this._staticDefs);
		$U.mapObject(cls.statics, function(v, k) {
			cls[k] = function() {
				return v.apply(cls, arguments);
			};
		});

		return cls;
	}
};