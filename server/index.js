'use strict';

const koa = require('koa');
const koaRouter = require('koa-router');

const GitHubApiClient = require('./ghclient');
const ApiV1 = require('./api/v1');
const ApiV2 = require('./api/v2');

// if (!config.sessionSecret) {
//   throw new Error('Define config.sessionSecret');
// }

const app = koa();
app.keys = [ /*config.sessionSecret*/ 'alaverdy' ];

const client = new GitHubApiClient({apiUrl: 'https://api.github.com'});
const apiV1 = ApiV1(koaRouter, client);
const apiV2 = ApiV2(koaRouter, client);

apiV1.prefix('/api/v1');
app
  .use(apiV1.routes())
  .use(apiV1.allowedMethods());

apiV2.prefix('/api/v2');
app
  .use(apiV2.routes())
  .use(apiV2.allowedMethods());

module.exports = app;
