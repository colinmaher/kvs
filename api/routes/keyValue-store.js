const express = require('express');
const router = express.Router();
const hash = {};

router.put('/', (req, res, next) => {
	const query = req.query;
	const key = Object.keys(query).toString();
	const value = Object.values(query).toString();
	//Error message working
	console.log("key: " + key + " value: " + value);
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
		res.status(200).json({
			'replaced': 'False',
			'msg': 'Added successfully',
		});
	}
	console.log("hash: " + hash);
})

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


router.get('/isKeyExists', (req, res, next) => {
	res.status(200).json({
		'result': 'hello i\'m search ONE is this working???'
	});
})

router.get('/getValue', (req, res, next) => {
	res.status(200).json({
		'result': 'hi i\'m search TWO is this working???'
	});
})


//
//Check if user input key & val are valid to be processed.
function keyCheck(key) {
	//If key is not alphanumeric OR empty
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
