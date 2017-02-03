'use strict';

module.exports = function(koaRouter, ghApiClient) {
    const router = koaRouter();
    router.get('/users/search', function *(next) {
        this.body = 'Hi from v2 api!'
    });

    return router;
}
