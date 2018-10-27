Message to Graders:

We followed the HW2 spec Piazza Post. The provided test script on Github
has a lot of differences in which the professor told us not to trust.

WE FOLLOWED THE SPECS


------------------------------------------------------------------------------
------------------------------------------------------------------------------
------------------------------------------------------------------------------


Git commands:
git checkout -b (new branch name w/o brackets)
git checkout (branch name you want to go to)
git branch //check which branch you're currently on

------------------------------------------------------------------------------
Docker commands:
docker system prune //delete all non-active things
docker kill $(docker ps -a) //kill all running containers

------------------------------------------------------------------------------
For HW2 part 1:

docker build -t app .
docker run -p 8080:8080 app

------------------------------------------------------------------------------
For HW2 part 2 specifically:

docker build -t app .

// Create the network.
docker network create --subnet=10.0.0.0/16 mynet

// Build the main (master) container.
docker run -p 8083:8080 --net=mynet --ip=10.0.0.20 app

// Build the proxy containers and specify the port they should follow.
docker run -p 8084:8080 --net=mynet -e MAINIP=10.0.0.20:8080 app
docker run -p 8085:8080 --net=mynet -e MAINIP=10.0.0.20:8080 app

------------------------------------------------------------------------------
Example cURL terminal commands to test HTTP connections and requests:

curl -X GET http://localhost:8080/keyValue-store/one -w “%{http_code}”
curl -X PUT -H "Content-Type: application/json" -d '{"val":"111111"}' http://localhost:8080/keyValue-store/oneoneone
