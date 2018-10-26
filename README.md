Docker commands:

docker build -t app .
docker run -p 8080:8080 app

docker system prune

-----------------------

For HW2 part 2 specifically:

docker build -t app .

// Create the network.
docker network create --subnet=10.0.0.0/16 mynet

// Build the main (master) container.
docker run -p 8083:8080 --net=mynet --ip=10.0.0.20 app

// Build the proxy containers and specify the port they should follow.
docker run -p 8084:8080 --net=mynet -e MAINIP=10.0.0.20:8080 app
docker run -p 8085:8080 --net=mynet -e MAINIP=10.0.0.20:8080 app
