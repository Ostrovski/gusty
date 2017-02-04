'use strict';

// I like to explicitly pass dependencies.
// Using ctx makes big apps pretty messy.
module.exports = function(router, ghApiClient) {
    router.get('/users/search', function *(next) {
        this.body = 'Hi from v2 api!'
    });
    return router;
}
