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
	
	if (key in hash) {
		res.status(201).json({
			'replaced': 'True',
			'msg': 'Added successfully',
		});
	} else {
		res.status(201).json({
			'replaced': 'False',
			'msg': 'Added successfully',
		});
	}
	hash[key] = value;
	console.log("hash: " + hash);

})

router.get('/', (req, res, next) => {
	//Error message working
	res.status(404).json({
		'result': 'Error',
		'msg': 'Not found'
	});
})


router.delete('/', (req, res, next) => {
	//Error message working
	res.status(404).json({
		'result': 'Error',
		'msg': 'Status code 404'
	});
})





//
//Check if user input key & val are valid to be processed.
function keyCheck(key) {
	//If key is not alphanumeric OR empty
	if (!key.match(/^[a-zA-Z0-9]+$/i) || key.trim() === '') {
		res.status(404).json({
			'result': 'Error',
			'msg': 'Key not valid'
		});
		return false;
	}
	//Otherwise, everything is fine and return true
	return true;
}
//Check if value is less than
function valCheck(val) {
	var size = encodeURI(s).split(/%..|./).length - 1;
	console.log("Printing size: " + size);
	if (size > 1000000) {
		res.status(404).json({
			'result': 'Error',
			'msg': 'Object too large. Size limit is 1MB'
		});
		return false;
	}
}

module.exports = router;