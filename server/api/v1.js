'use strict';

// I like to explicitly pass dependencies.
// Using ctx makes big apps pretty messy.
module.exports = function createApiHandler(router, ghApiClient) {
    // /search/accounts
    // /search/users
    // /search/orgs

    router.get('/search/:accountType', function *searchV1(next) {
        // this.params.accountType
        const users = yield ghApiClient.searchUsers(this.request.query.lang);

        this.body = users;
    });
    return router;
}
