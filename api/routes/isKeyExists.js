//For SEARCH call #1
console.log('hello this is search one');


const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
	//Error message working
	res.status(200).json({
		'result': 'HELLO this is search ONE is this working???'
	});
})

module.exports = router;
