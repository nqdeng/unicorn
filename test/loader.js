var assert = require("assert"),
	loader = require('../lib/loader');

var FILES = {
		'a.js': {
			data: new Buffer('var a;'),
			meta: {
				requires: [ 'b.js', 'c.js' ],
				mtime: 1,
				mime: 'application/javascript'
			},
			pathname: 'a.js'
		},

		'b.js': {
			data: new Buffer('var b;'),
			meta: {
				mtime: 2,
				mime: 'application/javascript'
			},
			pathname: 'b.js'
		},

		'c.js': {
			data: new Buffer('var c;'),
			meta: {
				requires: [ '{x}.js' ],
				mtime: 3,
				mime: 'application/javascript'
			},
			pathname: 'c.js'
		},

		'd.js': {
			data: new Buffer('var d;'),
			meta: {
				requires: [ 'b.js' ],
				mtime: 4,
				mime: 'application/javascript'
			},
			pathname: 'd.js'
		},

		'a.css': {
			data: new Buffer('#a {}'),
			meta: {
				mtime: 5,
				mime: 'text/css'
			},
			pathname: 'a.css'
		},

		'b.css': {
			data: new Buffer('#b {}'),
			meta: {
				mtime: 6,
				mime: 'text/css'
			},
			pathname: 'b.css'
		},
	},

	/**
	 * Check whether two binary datum equal.
	 * @param bin1 {Buffer}
	 * @param bin2 {Buffer}
	 * @return {boolean}
	 */
	binaryEqual = function (bin1, bin2) {
		var len = bin1.length,
			i = 0;

		if (len !== bin2.length) {
			return false;
		} else {
			for (; i < len; ++i) {
				if (bin1[i] !== bin2[i]) {
					return false;
				}
			}
			return true;
		}
	},

	read = function (pathname, callback) {
		setImmediate(function () {
			if (FILES[pathname]) {
				callback(null, FILES[pathname]);
			} else {
				callback(new Error('File not found @' + pathname));
			}
		});
	};

describe('loader.load', function () {
	describe('normally', function () {
		it('should load a single file', function (done) {
			loader.load('/a.css', read, function (err, cache, queue, meta) {
				assert.equal(err, null,
					'There should be no error');

				assert.equal(queue.length, 1,
					'There should be one file');

				assert.equal(queue[0], 'a.css',
					'The only file should be "a.css"');

				assert(binaryEqual(cache['a.css'], FILES['a.css'].data),
					'Data of "a.css" should be right');

				assert.equal(meta.mtime, FILES['a.css'].meta.mtime,
					'Modified time of "a.css" should be right');

				assert.equal(meta.mime, FILES['a.css'].meta.mime,
					'MIME of "a.css" should be right');

				done();
			});
		});

		it('should combine multiple files', function (done) {
			loader.load('/??a.css,b.css', read, function (err, cache, queue, meta) {
				assert.equal(err, null,
					'There should be no error');

				assert.equal(queue.length, 2,
					'There should be two files');

				assert.equal(queue[0], 'a.css',
					'The 1st file should be "a.css"');

				assert.equal(queue[1], 'b.css',
					'The 2nd file should be "b.css"');

				assert.equal(meta.mtime, Math.max(FILES['a.css'].meta.mtime, FILES['b.css'].meta.mtime),
					'Modified time should be the later one');

				assert.equal(meta.mime, FILES['a.css'].meta.mime,
					'MIME should be the same as "a.css"');

				assert.equal(meta.mime, FILES['b.css'].meta.mime,
					'MIME should be the same as "b.css"');

				done();
			});
		});

		it('should resolve file dependencies', function (done) {
			loader.load('/a.js', read, function (err, cache, queue, meta) {
				assert.equal(err, null,
					'There should be no error');

				assert.equal(queue.length, 3,
					'There should be three files');

				assert.equal(queue[0], 'b.js',
					'The 1st file should be "b.js"');

				assert.equal(queue[1], 'c.js',
					'The 2nd file should be "c.js"');

				assert.equal(queue[2], 'a.js',
					'The 3rd file should be "a.js"');

				done();
			});
		});

		it('could exclude nodes from file dependencies', function (done) {
			loader.load('/??-d.js,a.js', read, function (err, cache, queue, meta) {
				assert.equal(err, null,
					'There should be no error');

				assert.equal(queue.length, 2,
					'There should be three files');

				assert.equal(queue[0], 'c.js',
					'The 1st file should be "c.js"');

				assert.equal(queue[1], 'a.js',
					'The 2nd file should be "a.js"');

				done();
			});
		});

		it('should ignore dynamic dependencies without params', function (done) {
			loader.load('/c.js', read, function (err, cache, queue, meta) {
				assert.equal(err, null,
					'There should be no error');

				assert.equal(queue.length, 1,
					'There should be one file');

				assert.equal(queue[0], 'c.js',
					'The 1st file should be "c.js"');

				done();
			});
		});

		it('should use dynamic dependencies with params', function (done) {
			loader.load('/c.js?x=b', read, function (err, cache, queue, meta) {
				assert.equal(err, null,
					'There should be no error');

				assert.equal(queue.length, 2,
					'There should be two files');

				assert.equal(queue[0], 'b.js',
					'The 1st file should be "b.js"');

				assert.equal(queue[1], 'c.js',
					'The 1st file should be "c.js"');

				done();
			});
		});
	});

	describe('mercifully', function () {
		it('should ignore duplicate file in one request', function (done) {
			loader.load('/??a.css,a.css', read, function (err, cache, queue, meta) {
				assert.equal(err, null,
					'There should be no error');

				assert.equal(queue.length, 1,
					'There should be one file');

				assert.equal(queue[0], 'a.css',
					'The only file should be "a.css"');

				done();
			});
		});

		it('should ignore useless params', function (done) {
			loader.load('/??c.js?y=b', read, function (err, cache, queue, meta) {
				assert.equal(err, null,
					'There should be no error');

				assert.equal(queue.length, 1,
					'There should be one file');

				assert.equal(queue[0], 'c.js',
					'The only file should be "c.js"');

				done();
			});
		});

		it('should normalize pathnames of dynamic dependencies', function (done) {
			loader.load('/??c.js?x=c/../b', read, function (err, cache, queue, meta) {
				assert.equal(err, null,
					'There should be no error');

				assert.equal(queue.length, 2,
					'There should be two file');

				assert.equal(queue[0], 'b.js',
					'The only file should be "b.js"');

				assert.equal(queue[1], 'c.js',
					'The only file should be "c.js"');

				done();
			});
		});

		it('should prevent circular dependencies', function (done) {
			loader.load('/??c.js?x=a', read, function (err, cache, queue, meta) {
				assert.equal(err, null,
					'There should be no error');

				assert.equal(queue.length, 3,
					'There should be three file');

				assert.equal(queue[0], 'b.js',
					'The 1st file should be "b.js"');

				assert.equal(queue[1], 'a.js',
					'The 2nd file should be "a.js"');

				assert.equal(queue[2], 'c.js',
					'The 3rd file should be "c.js"');

				done();
			});
		});
	});

	describe('mercilessly', function () {
		it('should generate an error when requested file does not exist', function (done) {
			loader.load('/c.css', read, function (err, cache, queue, meta) {
				assert(err instanceof Error,
					'There should be an error');

				done();
			});
		});

		it('should generate an error when one of requested files does not exist', function (done) {
			loader.load('/??a.css,c.css', read, function (err, cache, queue, meta) {
				assert(err instanceof Error,
					'There should be an error');

				done();
			});
		});

		it('should generate an error when dependencies do not exist', function (done) {
			loader.load('/c.js?x=e', read, function (err, cache, queue, meta) {
				assert(err instanceof Error,
					'There should be an error');

				done();
			});
		});

		it('should generate an error when combine files with different type', function (done) {
			loader.load('/??a.js,a.css', read, function (err, cache, queue, meta) {
				assert(err instanceof Error,
					'There should be an error');

				done();
			});
		});
	});
});