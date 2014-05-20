var assert = require("assert"),
	url = require('../lib/url');

describe('url.parse', function () {
	describe('normally', function () {
		it('should parse "/foo/bar.js"', function () {
			var ret = url.parse('/foo/bar.js');

			assert.equal(ret.requires.length, 1,
				'Number of required files should be 1');

			assert.equal(ret.requires[0], 'foo/bar.js',
				'The only required file should be "foo/bar.js"');

			assert.equal(ret.excludes.length, 0,
				'Number of excluded files should be 0');

			assert.equal(Object.keys(ret.params).length, 0,
				'Number of params should be 0');
		});

		it('should parse "/foo/bar.js?m=n&x=y"', function () {
			var ret = url.parse('/foo/bar.js?m=n&x=y');

			assert.equal(ret.requires.length, 1,
				'Number of required files should be 1');

			assert.equal(ret.requires[0], 'foo/bar.js',
				'The only required file should be "foo/bar.js"');

			assert.equal(ret.excludes.length, 0,
				'Number of excluded files should be 0');

			assert.equal(Object.keys(ret.params).length, 2,
				'Number of params should be 2');

			assert.equal(ret.params.m, 'n',
				'Param "m" should be "n"');

			assert.equal(ret.params.x, 'y',
				'Param "x" should be "y"');
		});

		it('should parse "/base/??foo.js,bar.js"', function () {
			var ret = url.parse('/base/??foo.js,bar.js');

			assert.equal(ret.requires.length, 2,
				'Number of required files should be 2');

			assert.equal(ret.requires[0], 'base/foo.js',
				'The 1st required file should be "base/foo.js"');

			assert.equal(ret.requires[1], 'base/bar.js',
				'The 1st required file should be "base/bar.js"');

			assert.equal(ret.excludes.length, 0,
				'Number of excluded files should be 0');

			assert.equal(Object.keys(ret.params).length, 0,
				'Number of params should be 0');
		});

		it('should parse "/base/??foo.js,bar.js?m=n&x=y"', function () {
			var ret = url.parse('/base/??foo.js,bar.js?m=n&x=y');

			assert.equal(ret.requires.length, 2,
				'Number of required files should be 2');

			assert.equal(ret.requires[0], 'base/foo.js',
				'The 1st required file should be "base/foo.js"');

			assert.equal(ret.requires[1], 'base/bar.js',
				'The 1st required file should be "base/bar.js"');

			assert.equal(ret.excludes.length, 0,
				'Number of excluded files should be 0');

			assert.equal(Object.keys(ret.params).length, 2,
				'Number of params should be 2');

			assert.equal(ret.params.m, 'n',
				'Param "m" should be "n"');

			assert.equal(ret.params.x, 'y',
				'Param "x" should be "y"');
		});

		it('should parse "/base/??-foo.js,bar.js?m=n&x=y"', function () {
			var ret = url.parse('/base/??-foo.js,bar.js?m=n&x=y');

			assert.equal(ret.requires.length, 1,
				'Number of required files should be 1');

			assert.equal(ret.requires[0], 'base/bar.js',
				'The only required file should be "base/bar.js"');

			assert.equal(ret.excludes.length, 1,
				'Number of excluded files should be 1');

			assert.equal(ret.excludes[0], 'base/foo.js',
				'The only excluded file should be "base/foo.js"');

			assert.equal(Object.keys(ret.params).length, 2,
				'Number of params should be 2');

			assert.equal(ret.params.m, 'n',
				'Param "m" should be "n"');

			assert.equal(ret.params.x, 'y',
				'Param "x" should be "y"');
		});
	});

	describe('mercifully', function () {
		it('should parse "/foo/bar.js?x=y&x=z"', function () {
			var ret = url.parse('/foo/bar.js?x=y&x=z');

			assert.equal(Object.keys(ret.params).length, 1,
				'Number of params should be 1');

			assert.equal(ret.params.x, 'z',
				'Param with a same key will override the previous one');
		});

		it('should parse "/foo/bar.js?m&x=y"', function () {
			var ret = url.parse('/foo/bar.js?m&x=y');

			assert.equal(Object.keys(ret.params).length, 2,
				'Number of params should be 2');

			assert.equal(ret.params.m, '',
				'Param without a value will get a default value ""');

			assert.equal(ret.params.x, 'y',
				'Other params should behave normally.');
		});

		it('should parse "/base/??foo.js,foo.js"', function () {
			var ret = url.parse('/base/??foo.js,foo.js');

			assert.equal(ret.requires.length, 2,
				'The same 2 files should be counted twice');

			assert.equal(ret.requires[0], 'base/foo.js',
				'The 1st required file should be "base/foo.js"');

			assert.equal(ret.requires[1], 'base/foo.js',
				'The 1st required file should also be "base/foo.js"');
		});

		it('should parse "/base/??-foo.js,foo.js"', function () {
			var ret = url.parse('/base/??-foo.js,foo.js');

			assert.equal(ret.requires.length, 1,
				'"base/foo.js" should be required.');

			assert.equal(ret.requires[0], 'base/foo.js',
				'The only required file should be "base/foo.js"');

			assert.equal(ret.excludes.length, 1,
				'"base/foo.js" should also be excluded.');

			assert.equal(ret.excludes[0], 'base/foo.js',
				'The only excluded file should be "base/foo.js"');
		});

		it('should parse "/base/??../foo.js,./bar.js"', function () {
			var ret = url.parse('/base/??../foo.js,./bar.js');

			assert.equal(ret.requires.length, 2,
				'Number of required files should be 2');

			assert.equal(ret.requires[0], 'foo.js',
				'".." should be normalized');

			assert.equal(ret.requires[1], 'base/bar.js',
				'"." should also be kept');
		});

		it('should parse "/foo/bar.js?m=n?x=y"', function () {
			var ret = url.parse('/foo/bar.js?m=n?x=y');

			assert.equal(Object.keys(ret.params).length, 1,
				'The 2nd "?" and contents after it should be omitted');

			assert.equal(ret.params.m, 'n',
				'The only valid param should be "m=n"');
		});

		it('should parse "/base/??foo??bar.js?m=n"', function () {
			var ret = url.parse('/base/??foo??bar.js');

			assert.equal(ret.requires.length, 1,
				'The 2nd "??" and contents after it should be omitted');

			assert.equal(ret.requires[0], 'base/foo',
				'The only valid file should be "base/foo"');

			assert.equal(Object.keys(ret.params).length, 0,
				'Params after the 2nd "?" are omitted');
		});

		it('should parse "base/??foo.js,bar,js"', function () {
			var ret = url.parse('base/??foo.js,bar,js');

			assert.equal(ret.requires[0], 'base/foo.js',
				'The leading slash is prepended automatically.');
		});
	});
});

