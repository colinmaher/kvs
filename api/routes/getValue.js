//For SEARCH call #2
console.log('hey this is search TWO');


const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
	//Error message working
	res.status(200).json({
		'result': 'hi i\'m search TWO is this working???'
	});
})

module.exports = router;
