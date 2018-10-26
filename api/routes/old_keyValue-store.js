/*
 * CMPS 128 Fall 2018
 * Homework 2 - Single Key Value Store with Proxy Forwarding
 * Team mates: Annie Shen, Art Parkeenvincha, Colin Maher, Daniel Zheng
 */
const express = require('express');
const router = express.Router();
const hash = {};


//
// Check for is this Docker container is the Master node or Proxy node by
// seeing if MAINIP==undefined. Proceed if I'm Master, forward to Master if
// I'm one of the Proxy.
router.use(function(req, res, next){
	console.log('Request URL:', req.originalUrl);

	if(process.env.MAINIP !== undefined) {
		console.log('about to redirect------');

		console.log(req);



		try {
			res.redirect('http://localhost:8083' + req.originalUrl);
		} catch (err) {
			console.log('in catch. error happened.');
			console.log(err);
			next();
		}

		console.log('-----------------------');

	}
	else {
		console.log('NOT redirecting. I am the Master!');
		next();
	}
	// next();
});


//
// The PUT request
// Store the given key into our hash table. Insert both when the key is new
// and when the key was know and replace the value.
router.put('/', (req, res, next) => {
	const query = req.query;
	const key = Object.keys(query).toString();
	const value = Object.values(query).toString();
	//Error message working
	console.log("key: " + key + " value: " + value);
	console.log("process mainip: " + process.env.MAINIP);

	//convert to string

	if (!keyCheck(key)) {
		res.status(404).json({
			'result': 'Error',
			'msg': 'Key not valid'
		});
	} else if (valCheck(value)) {
		res.status(404).json({
			'result': 'Error',
			'msg': 'Object too large. Size limit is 1MB'
		});
	} else if (key in hash) {
		hash[key] = value;
		res.status(201).json({
			'replaced': 'True',
			'msg': 'Added successfully',
		});
	} else {
		hash[key] = value;
		res.status(201).json({
			'replaced': false,
			'msg': 'Added successfully',
		});
	}
	console.log("hash: " + hash);
})


//
// The GET request
// Return the value of the key being asked for by the user.
// Return error message if key does not exist in hash table.
router.get('/', (req, res, next) => {
	//Error message working
	const query = req.query;
	const key = Object.keys(query).toString();

	if (key in hash) {
		res.status(200).json({
			'result': 'Success',
			'value': hash[key]
		});
	} else {
		res.status(404).json({
			'result': 'Error',
			'msg': 'Not Found'
		});
	}
})


//
// The DELETE request
// Deletes the given key and the corresponding key from hash table.
// Return error message if the key doesn't exist in the hash table.
router.delete('/', (req, res, next) => {
	const query = req.query;
	const key = Object.keys(query).toString();
	//Error message working
	if (key in hash) {
		delete hash[key];
		res.status(200).json({
			'result': 'Success',
		});
	} else {
		res.status(404).json({
			'result': 'Error',
			'msg': 'Status code 404'
		});
	}
})


//
// The SEARCH (type 2), aka GET request
// Return the value that's corresponding to the key given.
// Return error message if the key doesn't exist in the hash table.
router.get('/search', (req, res, next) => {
	const query = req.query;
	const key = Object.keys(query).toString();

	if (key in hash) {
		res.status(200).json({
			'result': 'Success',
			'isExists': 'Key found'
		});
	} else {
		res.status(404).json({
			'result': 'Failure',
			'isExists': 'Key not found'
		});
	}
})


//
// ***In progress. Come back if have time before due.
//Cleaning up the error checking.
/*
function checks(key, val) {
	const k = keyCheck(key);
	const v = valCheck(val);

}
*/


//
// Functions to check valididations of user's key and value.
// Return error message if not within regulations.
function keyCheck(key) {
	//If key is not alphanumeric OR empty
	if (key.length > 200) {
		return false;
	}
	if (!key.match(/^[a-zA-Z0-9]+$/i) || key.trim() === '') {
		return false;
	}
	//Otherwise, everything is fine and return true
	return true;
}
//Check if value is less than
function valCheck(val) {
	const size = byteLength(val);
	console.log("Printing size: " + size);
	if (size > 1000000) {
		return false;
	}
}
// https://gist.github.com/lovasoa/11357947
function byteLength(str) {
	// returns the byte length of an utf8 string
	var s = str.length;
	for (var i = str.length - 1; i >= 0; i--) {
		var code = str.charCodeAt(i);
		if (code > 0x7f && code <= 0x7ff) s++;
		else if (code > 0x7ff && code <= 0xffff) s += 2;
		if (code >= 0xDC00 && code <= 0xDFFF) i--; //trail surrogate
	}
	return s;
}



module.exports = router;
