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
- Different content types (via HTTP headers or URLs)
- Auth (?)
- Requests limitation

## Commands
```
# Run dev version
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up [-d]

# Run prod version
docker-compose -f docker-compose.yml up [-d]

# Stop service
docker-compose stop
```

## Options
```
PORT
LOG_LEVEL
GITHUB_API_ENDPOINT
API_ACCESS_TOKEN
OAUTH_CLIENT_ID
OAUTH_CLIENT_SECRET
CACHE_MAX_SIZE
CACHE_MAX_AGE
```

## Misc
 - Get keys from here https://help.github.com/articles/creating-an-access-token-for-command-line-use/