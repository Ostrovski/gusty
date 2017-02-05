# Gusty - GitHub Users Search

## Task
Create a service which provides a single API endpoint to search for GitHub users by the programming
language they use in their public repositories. Each user returned in the response of the search
request should at least contain the username, name, avatar url and number of followers.
Use the GitHub APIs (https://developer.github.com/v3/) to retrieve the information.
The service should be developed in node.js. Feel free to use any node.js libraries and npm modules you
find suitable for this task. The service should be covered with tests you find suitable for this task.
Create a Dockerfile to run the service. Please put the project on github.

## Features
### Search for users, orgs or both
Search URL format is `/api/v1/search/:account_type` where `:account_type` can be `users`, `orgs` or
`accounts`.

### Incomplete results detection
Each search attempt produces bunch of requests to GitHub API. There is always a one request for
`/search/users` plus up to 100 subsecuent requests for member profiles. Since GitHub strictly limits
number of requests to its API there could be a situation when only a part of profile requests is
fulfilled. For such situations each search result contains field called `incomplete`. It's an array
of user IDs without profile data.

### LRU cache for GitHub API responses
To decrease GitHub API usage Gusty uses an in-memory LRU cache for GitHub API resources. If GitHub API
response provides `ETag` HTTP header Gusty saves its content for a configurable period of type.
Consequent request for such resource will be with `If-None-Match` HTTP header and in case of `304`
status code the cached value will be used. Since the cache is LRU the required memory amount is limited.
Least used items will be evicted.

### Different content types (via HTTP Accept header or URLs suffix)
Gusty can respond via `JSON` or [`MessagePack`](http://msgpack.org/). To specify desired content type
one can use HTTP `Accept` header (`application/json` or `application/x-msgpack`) or use URL suffixes:
```
curl -i http://localhost:8080/api/v1/search/accounts.msgp?lang=elixir
```

### Pagination via "Hypermedia link relations" (HTTP Link header)
Pagination works pretty the same as in the GitHub API. Gusty's API client should read HTTP `Link`
header to get links for the `next`, `prev`, `first` and `last` pages.

### Sorting result
Search result can be sorted by number of `followers` or `repositories` or date when user `joined`.
```
curl -i http://localhost:8080/api/v1/search/accounts.msgp?lang=elixir&sort=followers&order=asc
```

### API versioning
To show how API versioning can be achieved Gusty provides `API v1` and `API v2` modules. Actually,
the last one is just an alias for the first one.

## Commands
```
# Run dev version
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up [-d]

# Run prod version
docker-compose -f docker-compose.yml up [-d]

# Stop service
docker-compose stop
```

## Usage
```
# Basic
curl http://localhost:8080/api/v1/search/users?lang=elixir     # Search for users used elixir
curl http://localhost:8080/api/v1/search/orgs?lang=elixir      # Search for orgs used elixir
curl http://localhost:8080/api/v1/search/accounts?lang=elixir  # Search for users or orgs used elixir

# Pagination
curl -i http://localhost:8080/api/v1/search/users?lang=elixir&page=3&per_page=20  # Have a look at Link header

# Sorting
curl http://localhost:8080/api/v1/search/users?lang=elixir&sort=joined&order=asc
```

## Testing
Use the following command to run tests:
```
docker-compose -f docker-compose.yml -f docker-compose.dev.yml run gusty_app npm test
```
There is two test cases. One for GitHub API client (kinda unit testing) and one for an entire app
(kinda acceptance testing). For a real-life project I would rather test middlewares too. But here
I decided to skip such tests because they would look pretty borring. Instead I decided to write a
bunch of acceptances tests.

## Limitations
GitHub API has strict rate limits for unauthorized requests. Get your personal access token
(see https://help.github.com/articles/creating-an-access-token-for-command-line-use/)
or use OAuth `client_id` and `client_secret` to increase rate limits (see https://github.com/settings/developers).

## Options
The following options can be specified via `docker-compose.*.yml` or `gusty-vars.env`.
```
PORT                  # TCP port to run gusty app (backend). Default is 5000.
LOG_LEVEL             # Gust app logging level. Default is 'warn'.
GITHUB_API_ENDPOINT   # Default is https://api.github.com
API_ACCESS_TOKEN      # No default value.
OAUTH_CLIENT_ID       # No default value.
OAUTH_CLIENT_SECRET   # No default value.
CACHE_MAX_SIZE        # GitHub API client cache size. I.e. max number of in-memory saved responses. Default is 1000.
CACHE_MAX_AGE         # GitHub API client cache item TTL. Default is 10 min.
```
