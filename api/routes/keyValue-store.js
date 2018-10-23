const express = require('express');
const router = express.Router();
const hash = {};

router.put('/', (req, res, next) => {
	var query = req.query;
	//Error message working
	console.log(Object.values(query).toString());
	//convert to string
	hash[Object.keys(query).toString()] = Object.values(query).toString();
	console.log("hash: " + hash);
	res.status(201).json({
		'replaced': 'False',
		'msg': 'Added successfully',
		'key': Object.keys(query),
		'val': Object.values(query)
	});
})

router.get('/', (req, res, next) => {
	//Error message working
	res.status(404).json({
		'result': 'Error',
		'msg': 'Not Found'
	});
})


router.delete('/', (req, res, next) => {
	//Error message working
	res.status(404).json({
		'result': 'Error',
		'msg': 'Status code 404'
	});
})

module.exports = router;