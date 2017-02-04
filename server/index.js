'use strict';

const koa = require('koa');
const koaRouter = require('koa-router');
const koaValidate = require('koa-validate');
const msgpack = require('msgpack-lite');
const request = require('request');

const errorHandler = require('./errors');
const GitHubApiClient = require('./github-api-client');
const ApiV1 = require('./api/v1');
const ApiV2 = require('./api/v2');
const linkHeader = require('./middlewares/link-header');
const respondWith = require('./middlewares/respond-with');
const rewriteAccept = require('./middlewares/rewrite-accept');

const logger = require('winston');
logger.emitErrs = true;
logger.level = process.env.LOG_LEVEL || 'warn';

// if (!config.sessionSecret) {
//     throw new Error('Define config.sessionSecret');
// }

// if (!(options.accessToken || (options.clientId && options.clientSecret))) {
//     throw new Error('No auth data provided');
// }

const app = koa();
app.on('error', function(err, ctx) {
    logger.error(`${err.message}. ${err.description || ''}`);
});
koaValidate(app);

const client = new GitHubApiClient(
    request,
    {rootEndpoint: 'https://api.github.com'},
    logger
);
const apiV1 = ApiV1(koaRouter({prefix: '/api/v1'}), client);
const apiV2 = ApiV2(koaRouter({prefix: '/api/v2'}), client);

app
  .use(rewriteAccept({
      '.json': 'application/json',
      '.msgp': 'application/x-msgpack'
  }))
  .use(respondWith({
      'application/json': (b) => b,  // as is
      'application/x-msgpack': msgpack.encode
  }))
  .use(errorHandler())
  .use(linkHeader())
  .use(apiV1.routes())
  .use(apiV1.allowedMethods())
  .use(apiV2.routes())
  .use(apiV2.allowedMethods());

module.exports = app;
