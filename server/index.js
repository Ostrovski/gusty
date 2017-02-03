'use strict';

const koa = require('koa');

// if (!config.sessionSecret) {
//   throw new Error('Define config.sessionSecret');
// }

const app = koa();
app.keys = [ /*config.sessionSecret*/ 'alaverdy' ];
app.use(function *() {
  this.body = 'Hey there! 5'
});

module.exports = app;
