'use strict';

// I like to explicitly pass dependencies.
// Using ctx makes big apps pretty messy.
module.exports = function(router, ghApiClient) {
    // /langs/<lang>/accounts
    // /langs/<lang>/users
    // /langs/<lang>/orgs

    router.get('/users/search', function *searchV1(next) {
        this.body = {foo: 'Hi from v1 api!'};
    });
    return router;
}
