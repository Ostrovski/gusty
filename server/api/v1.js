'use strict';

// I like to explicitly pass dependencies.
// Using ctx for it makes big apps pretty messy.
module.exports = function createApiHandler(router, ghApiClient) {
    const accountTypes = {'users': 'user', 'orgs': 'org'};

    router.use(function *cors(next) {
        yield* next;
        this.set({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'ETag, Link',
            'Cache-Control': 'no-cache'
        });
    });

    router.get('/search/:account_type', function *searchV1(next) {
        this.checkParams('account_type').in(['users', 'orgs', 'accounts']);
        this.checkQuery('lang').notEmpty();
        this.checkQuery('sort').empty().in(['followers', 'repositories', 'joined']);
        this.checkQuery('order').empty().in(['asc', 'desc']);
        this.checkQuery('page').empty().gt(0).toInt();
        this.checkQuery('per_page').empty().gt(0).lt(101).toInt();

        if (this.errors) {
            this.throw(400, {
                expose: true,
                message: 'bad request params',
                description: this.errors
            });
        }

        const options = {
            type: accountTypes[this.params.account_type],
            sorting: {},
            paging: {}
        };
        if (this.query.sort) {
            options.sorting.sort = this.query.sort;
        }
        if (this.query.order) {
            options.sorting.order = this.query.order;
        }
        if (this.query.page) {
            options.paging.page = this.query.page;
        }
        if (this.query.per_page) {
            options.paging.per_page = this.query.per_page;
        }

        const results = yield ghApiClient.searchUsers(this.query.lang, options);

        this.state._x_GitHubRel = results.rel;
        this.body = results.data;
    });
    return router;
};
