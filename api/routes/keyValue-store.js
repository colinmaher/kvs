const express = require('express');
const router = express.Router();

router.put('/', (req, res, next) => {
	var query = req.query;
	//Error message working
	res.status(201).json({
		'replaced': 'False',
		'msg':'Added successfully',
		'key':Object.keys(query),
		'val':Object.values(query)
	});
})

router.get('/', (req, res, next) => {
	//Error message working
	res.status(404).json({
		'result': 'Error',
		'msg':'Not Found'
	});
})


router.delete('/', (req, res, next) => {
	//Error message working
	res.status(404).json({
		'result': 'Error',
		'msg':'Status code 404'
	});
})

module.exports = router;
