# Gusty - Github Users Search

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

## Misc
- I don't want to mess with babel.
- I want keep it really simple.
- But I want to show that I'm aware at least about dev/prod envs.
