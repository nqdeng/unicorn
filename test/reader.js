var assert = require("assert"),
	reader = require('../lib/reader');

var SOURCE = 'fake://',

	FILES = {
		'foo': {
			head: new Buffer(0),
			body: new Buffer('Hello World!'),
			mime: 'text/plain',
			mtime: Date.now()
		},
		'bar': {
			head: new Buffer(
				'/*!meta       21{"mime":"text/plain","foo":"bar"}*/'),
			body: new Buffer([ 0x01, 0x02, 0x03, 0x04, 0x05, 0x06 ]),
			mime: 'application/octet',
			mtime: Date.now()
		},
		'bar.bad1': {
			head: new Buffer('/*!meta        d{"foo":"bar"*/'),
			body: new Buffer([ 0x01, 0x02, 0x03, 0x04, 0x05, 0x06 ]),
			mime: 'application/octet',
			mtime: Date.now()
		},
		'bar.bad2': {
			head: new Buffer('/*!meta ^$$#ED8@{"foo":"bar"}*/'),
			body: new Buffer([ 0x01, 0x02, 0x03, 0x04, 0x05, 0x06 ]),
			mime: 'application/octet',
			mtime: Date.now()
		},
		'baz': null
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

	/**
	 * The faked request function.
	 * @param pathname {string}
	 * @param callback {Function}
	 */
	request = function (pathname, callback) {
		assert.equal(pathname.indexOf(SOURCE), 0,
			'source should be prepended at pathname');

		pathname = pathname.replace(SOURCE, '');

		setImmediate(function () {
			if (FILES[pathname] === null) {
				callback(new Error());
			} else {
				var status = FILES.hasOwnProperty(pathname) ? 200 : 404,
					file = FILES[pathname] || {},
					headers = {
						'content-type': file.mime,
						'last-modified': file.mtime
					},
					body = (status === 200) ?
						Buffer.concat([ file.head, file.body ]) : 'ERROR';

				callback(null, {
					status: function () {
						return status;
					},
					head: function (key) {
						return headers[key];
					},
					get binary() {
						return body;
					}
				});
			}
		});
	};

describe('reader.create', function () {
	var read = reader.create(SOURCE, request);

	describe('normally', function () {
		it('should read a text file without a header', function (done) {
			read('foo', function (err, file) {
				assert.equal(err, null,
					'There should be no error');

				assert.equal(file.pathname, 'foo',
					'The reader should echo the pathname');

				assert.equal(file.meta.mtime, FILES['foo'].mtime,
					'The reader should read the mtime');

				assert.equal(file.meta.mime, FILES['foo'].mime,
					'The reader should read the mime');

				assert(binaryEqual(file.data, FILES['foo'].body),
					'The reader should return the file data');

				done();
			});
		});

		it('should read a text file with a header', function (done) {
			read('bar', function (err, file) {
				assert.equal(err, null,
					'There should be no error');

				assert.equal(file.pathname, 'bar',
					'The reader should echo the pathname');

				assert.equal(file.meta.mtime, FILES['bar'].mtime,
					'The reader should read the mtime');

				assert.equal(file.meta.mime, 'text/plain',
					'Properties in meta should override the default ones');

				assert.equal(file.meta.foo, 'bar',
					'The reader should read the custom property');

				assert(binaryEqual(file.data, FILES['bar'].body),
					'The reader should split the file data out');

				done();
			});
		});
	});

	describe('mercilessly', function () {
		it('should generate an error while a file not exists', function (done) {
			read('fooo', function (err, file) {
				assert(err instanceof Error,
					'There should be an error');

				assert.equal(err.code, 'ENOENT',
					'Error code should be "ENOENT"');

				assert.equal(err.message, 'File not found @fooo',
					'Error message should tell the nonexisting file');

				done();
			});
		});

		it('should generate an error while IO error occurs', function (done) {
			read('baz', function (err, file) {
				assert(err instanceof Error,
					'There should be an error');

				assert.notEqual(err.code, 'ENOENT',
					'Error code should not be "ENOENT"');

				assert.equal(typeof err.message, 'string',
					'Error message should be a string');

				done();
			});
		});

		it('should generate an error while meta length wrong', function (done) {
			read('bar.bad2', function (err, file) {
				assert(err instanceof Error,
					'There should be an error');

				assert.notEqual(err.code, 'ENOENT',
					'Error code should not be "ENOENT"');

				assert.equal(err.message, 'Broken meta @bar.bad2',
					'Error message should tell the meta-broken file');

				done();
			});
		});

		it('should generate an error while meta JSON wrong', function (done) {
			read('bar.bad1', function (err, file) {
				assert(err instanceof Error,
					'There should be an error');

				assert.notEqual(err.code, 'ENOENT',
					'Error code should not be "ENOENT"');

				assert.equal(err.message, 'Broken meta @bar.bad1',
					'Error message should tell the meta-broken file');

				done();
			});
		});
	});
});