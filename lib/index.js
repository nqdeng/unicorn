var pegasus = require('pegasus'),
	loader = require('./loader'),
	reader = require('./reader'),
	util = pegasus.util;

var	PATTERN_LAST_SLASH = /\/$/,

	unicorn = pegasus.createPipe({
		/**
		 * Initializer.
		 * @param config {Object}
		 */
		_initialize: function (config) {
			if (util.isString(config)) { // Fast config.
				config = {
					source: config
				};
			}

			config = util.mix({
				source: null, // Default source is not so useful.
				expires: 31536000 // Default expires set to 1 year.
			}, config);

			if (!PATTERN_LAST_SLASH.test(config.source)) {
				// Source should end with slash.
				config.source += '/';
			}

			this._source = config.source;
			this._expires = config.expires;
		},

		/**
		 * GET method.
		 * @param context {Object}
		 * @param next {Function}
		 */
		get: function (context, next) {
			var request = context.request,
				response = context.response,
				read = reader.create(this._source, request),
				expires = this._expires,
				self = this;

			loader.load(request.path, read, function (err, cache, queue, meta) {
				if (err) {
					if (err.code === 'ENOENT') {
						response
							.status(404)
							.head({
								'content-type': 'text/plain'
							})
							.data(err.message);
						next();
					} else {
						next(err);
					}
				} else {
					response
						.status(200)
						.head({
							'content-type': meta.mime,
							'expires': new Date(Date.now() + 1000 * expires)
								.toGMTString(),
							'cache-control': 'max-age=' + expires,
							'last-modified': new Date(meta.mtime)
								.toGMTString(),
							'vary': 'Accept-Encoding'
						});

					var i = 0,
						len = queue.length,
						data = [],
						chunk,
						size = 0;

					// Combine files with dependencies-first order.
					for (; i < len; ++i) {
						chunk = cache[queue[i]];
						size += chunk.length;
						data.push(chunk);
					}

					response.data(Buffer.concat(data, size));

					next();
				}
			});
		}
	});

module.exports = unicorn;
