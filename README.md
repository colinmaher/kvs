Docker commands:

docker build -t app .
docker run -p 8080:8080 app

docker system prune //delete all non-active things
docker kill $(docker ps -a) //kill all running containers

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


------------------------------------------------------------------------------
------------------------------------------------------------------------------

Annie's Log - Oct 26 @ 2:30AM

After coming home I asked my friend to check out what we had.
Turned out we fucked (everything?) up.

Our HTTP requests going through PostMan has been something along the lines of:
    -> http://localhost:8080/keyValue-store/?hello=world
And this is a huge fucking problem.

The requests will work like how the test scripts shows it, all HTTP requests
comes with NO '?'.

The basic request handling for Node.js includes the '?'. Not saying it's wrong,
but we're wrong in the sense of the homework assignment...

So we gotta fix that. And I fixed the routing issue!
By basically not doing the router.something anymore. You can see at line 31 in
the keyValue-store.js file in my new branch 'fixing' (so in case i don't fuck
literally everything up).
Each 'request call' turned into a new custom function just so we don't have
the freaking little '?'.


I was able to get the key to be saved as a variable, by trimming the originalUrl
to only store whatever is after the '/keyValue-store/'. Which works. Amazing.

Now, what's the problem?
I cannot for THE LIFE OF ME get value from the request body.
Dear lord I tried, but I couldn't figure it out and idk why?!!?!?

So ya'll please help each other out. Figure out how to store the fucking value.
I'm going to talk to Peter about our situation and see what he says...

Here's some resources I found helpful (but maybe my brain wasn't functioning anymore...),
please utilize them. Text me to let me know what's up!!! I'm stressed AF :D <3
-https://expressjs.com/en/4x/api.html#req.body
-https://expressjs.com/en/resources/utils.html
-https://scotch.io/tutorials/build-a-restful-api-using-node-and-express-4
-https://expressjs.com/en/api.html#app.route
-https://www.tutorialspoint.com/nodejs/nodejs_restful_api.htm


praised the lord.
