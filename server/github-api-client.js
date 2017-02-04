'use strict';

class ApiClient {
    // https://developer.github.com/guides/best-practices-for-integrators/
    // https://help.github.com/articles/creating-an-access-token-for-command-line-use/

    // Add ?client_id=xxxx&client_secret=yyyy or ?access_token=OAUTH-TOKEN
    // Add header Accept: application/vnd.github.v3+json
    // User-Agent: Awesome-Octocat-App

    // Sorting
    // Number of followers
    // Number of repositories
    // When they joined GitHub

    constructor(request, options) {
        this.request = request;
        this.apiUrl = options.apiUrl;
        this.accessToken = options.accessToken;
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
    }

    searchUsers(lang, sort, order, query) {
        query = query || {};

        request('http://www.google.com', function(error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body) // Show the HTML for the Google homepage.
            }
        });
    }

    // Make requests for a single user or client ID serially. Do not make requests for a single user or client ID concurrently.
    // Check Retry-After header
    getUser(username) {
        // Use ETag
    }
}

module.exports = ApiClient;
