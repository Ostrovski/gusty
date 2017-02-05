# Gusty - GitHub Users Search

## Task
Create a service which provides a single API endpoint to search for GitHub users by the programming language they use in their public repositories. Each user returned in the response of the search request should at least contain the username, name, avatar url and number of followers.
Use the GitHub APIs (https://developer.github.com/v3/) to retrieve the information.
The service should be developed in node.js. Feel free to use any node.js libraries and npm modules you find suitable for this task.
The service should be covered with tests you find suitable for this task.
Create a Dockerfile to run the service.

Please put the project on github.

## Features
- API versioning
- Different content types (via HTTP Accept header or URLs suffix)
- LRU cache for GitHub API responses
- Pagination via "Hypermedia link relations" (HTTP Link header)

## Commands
```
# Run dev version
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up [-d]

# Run prod version
docker-compose -f docker-compose.yml up [-d]

# Stop service
docker-compose stop

# Testing
docker-compose -f docker-compose.yml -f docker-compose.dev.yml run gusty_app npm test
```

## Limitations
Get personal access token (see https://help.github.com/articles/creating-an-access-token-for-command-line-use/)
or use OAuth client_id & client_secret to increase rate limits.

## Options
The following options could be specified via `docker-compose.*.yml` or `gusty-vars.env`.
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
