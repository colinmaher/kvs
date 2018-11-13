/*
 * CMPS 128 Fall 2018
 * Homework 3 - Causally and Eventually Consistent Key Value Store 
 * Team: Colin Maher, Daniel Zheng
 */

'use strict';

const express = require('express')
const router = express.Router()
const fetch = require('isomorphic-fetch')

const hash = {}
const key_vc = {}
const process_ip = process.env.IP_PORT
let system_view = process.env.VIEW
let ip_array

const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;

const $ = require('jquery')(window);

router.use(function (req, res, next) {
	console.log('Request URL:', req.protocol + "://" + req.get('host') + req.originalUrl)
	console.log("My IP: " + process_ip)
	console.log("VIEW: " + system_view)
	ip_array = system_view.split(',')
	next()
});



function broadcast(req, method, data) {
	for (let index in ip_array) {
		if (ip_array[index] != process_ip) {
			//prep data for broadcast
			console.log(data)
			// const searchParams = Object.keys(data).map((key) => {
			// 	return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
			// }).join('&');
			let encoded_data = $.param(data)
			
			let params = {
				headers: {
					"content-type": "application/x-www-form-urlencoded"
				},
				body: encoded_data,
				method: method
			}
			console.log(ip_array[index])
			console.log("request: " + req.protocol + "://" + ip_array[index] + req.originalUrl)
			fetch(req.protocol + "://" + ip_array[index] + req.originalUrl, params)
				.then(res => {
					if (res.ok) {
						return res.json()
					} else {
						return Promise.reject()
					}
				})
				.then(json => {
					console.log(JSON.stringify(json))
				})
				.catch(error => {
					console.log(error)
				})
		}
	}
}

// View routes
router.get('/view/', (req, res) => {
	res.status(200).json({
		'view': system_view,
	})
})

router.put('/view/', (req, res) => {
	console.log("VIEW: " + system_view)
	// ip_array = system_view.split(',')
	console.log("received: " + req.body.received)
	let ip = req.body.ip_port
	//check for valid ip
	if (!ip.match(/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]):[0-9]+$/)) {
		res.status(404).json({
			'result': 'Error',
			'msg': ip + " is not a valid IP"
		})
	} else if (req.body.received) {
		system_view = system_view.concat(",", ip)
		ip_array.push(ip)
		console.log("added " + ip + " to view")
		res.status(200).json({
			'result': 'Success',
			'msg': "Successfully added " + ip + " to view"
		})
	} else if (ip_array.includes(ip)) {
		res.status(404).json({
			'result': 'Error',
			'msg': ip + " is already in view"
		})
	} else {
		system_view = system_view.concat(",", ip)
		ip_array.push(ip)
		console.log(system_view)
		console.log(system_view.split(','))
		console.log(ip_array)
		let data = {
			received: true,
			ip_port: ip
		}
		broadcast(req, 'PUT', data)
		res.status(200).json({
			'result': 'Success',
			'msg': "Successfully added " + ip + " to view"
		})
	}

})

router.delete('/view/', (req, res) => {
	if (!ip.match(/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]):[0-9]+$/)) {
		res.status(404).json({
			'result': 'Error',
			'msg': ip + " is not a valid IP"
		})
	} else if (req.body.received) {
		removeIp(req.body.ip_port)
		res.status(200).json({
			'result': 'Success',
			'msg': "Successfully added " + req.body.ip_port + " to view"
		})
	} else if (ip_array.includes(req.body.ip_port)) {
		let data = {
			received: true,
			ip_port: req.body.ip_port
		}
		broadcast(req, 'DELETE', data)
		removeIp(req.body.ip_port)
		res.status(200).json({
			'result': 'Success',
			'msg': "Successfully removed " + req.body.ip_port + " from view"
		})
	} else {
		res.status(404).json({
			'result': 'Error',
			'msg': req.body.ip_port + " is not in view"
		})
	}

})

function removeIp(ip) {
	ip_array = ip_array.filter(current_ip => current_ip !== ip);
	system_view = ip_array.join(',')
}

// Search routes
router.get('/search/:key', (req, res) => {
	let key = req.params.key
	console.log(key)
	console.log(req.body)
	console.log(req.body.payload)
	let payload = req.body.payload
	console.log(payload)
	if (!canRead(payload, key)) {
		res.status(404).json({
			'result': 'Error',
			'msg': 'Cannot read',
			'payload': payload,
		})
	}
	if (key in hash) {
		res.status(200).json({
			'isExists': true,
			'result': 'Success',
			'payload': payload,
		})
	} else {
		res.status(200).json({
			'isExists': false,
			'result': 'Success',
			'payload': payload,
		})
	}
})

//Basic operation routes
router.put('/:key', (req, res) => {
	console.log(req.body)
	console.log(req.is())
	let key = req.params.key
	console.log("key: " + key)
	let value = req.body.val
	console.log(value)
	// console.log(req.body.payload)
	let payload = req.body.payload
	console.log(payload)
	if (!keyCheck(key)) {
		res.status(404).json({
			'msg': 'Key not valid',
			'result': 'Error',
			'payload': payload,
		})
	} else if (valCheck(value)) {
		res.status(404).json({
			'result': 'Error',
			'msg': 'Object too large. Size limit is 1MB',
			'payload': payload,
		})
	} else if (value == undefined) {
		res.status(404).json({
			'msg': 'Error',
			'error': 'Value is missing',
			'payload': payload,
		})
	} else if (key in hash) {
		key_vc[key].value += 1
		key_vc[key].timestamp = Date.now()
		if (!req.body.received) {
			let data = {
				val: value,
				payload: key_vc,
				received: true
			}
			broadcast(req, 'PUT', data)
		}
		hash[key] = value;
		res.status(201).json({
			'replaced': true,
			'msg': 'Updated successfully',
			'payload': key_vc,
		})
	} else {
		//if first write
		if (!req.body.received) {
			key_vc[key] = {
				value: 1,
				timestamp: Date.now()
			}
			let data = {
				val: value,
				payload: key_vc,
				received: true
			}
			broadcast(req, 'PUT', data)

		} else { //keep timestamp of first write
			key_vc[key] = payload[key]
		}
		hash[key] = value;
		res.status(200).json({
			'replaced': false,
			'msg': 'Added successfully',
			'payload': key_vc,
		})
	}

})

router.get('/:key', (req, res) => {
	let key = req.params.key
	let payload = req.body.payload
	// console.log(JSON.stringify(payload))
	if (!canRead(payload, key)) {
		res.status(404).json({
			'result': 'Error',
			'msg': 'Cannot read',
			'payload': payload,
		})
	} else {
		if (key in hash) {
			res.status(200).json({
				'result': 'Success',
				'value': hash[key],
				'payload': key_vc,
			})
		} else {
			res.status(404).json({
				'result': 'Error',
				'msg': 'Key does not exist',
				'payload': key_vc,
			})
		}
	}
})

//determines whether or not we can return a value
function canRead(payload, prop) {
	// console.log("key: " + prop)
	if (payload.hasOwnProperty(prop) && key_vc.hasOwnProperty(prop)) {
		console.log("incoming value: " + payload[prop].value)
		console.log("my value: " + key_vc[prop].value)
		console.log("incoming timestamp: " + payload[prop].timestamp)
		console.log("my timestamp: " + key_vc[prop].timestamp)
		if (payload[prop].value < key_vc[prop].value) {
			return true
		} else if (payload[prop].value > key_vc[prop].value) {
			return false
		} else {
			//check timestamp
			if (payload[prop].timestamp >= key_vc[prop].timestamp) {
				return false
			} else {
				return true
			}
		}
	} else if (payload.hasOwnProperty(prop) && !key_vc.hasOwnProperty(prop)) {
		return false
	} else {
		return true
	}
}

router.delete('/:key', (req, res) => {
	let key = req.params.key
	let payload = req.body.payload
	if (key in hash) {
		if (!req.body.received) {
			let data = {
				payload: payload,
				received: true
			}
			broadcast(req, 'DELETE', data)
		}
		delete hash[key]
		delete key_vc[key]
		res.status(200).json({
			'result': 'Success',
			'msg': 'Key deleted',
			'payload': key_vc,
		})
	} else {
		res.status(404).json({
			'result': 'Error',
			'msg': 'Key does not exist',
			'payload': payload,
		})
	}
})

// Functions to validate key and value.
function keyCheck(key) {
	//If key is too long, not alphanumeric or empty
	if (key.length > 200) {
		return false
	}
	if (!key.match(/^[a-zA-Z0-9]+$/i) || key.trim() === '') {
		return false
	}
	return true
}

function valCheck(val) {
	let size = byteLength(val)
	console.log("Printing size: " + size)
	if (size > 1000000) {
		return false
	}
}

// https://gist.github.com/lovasoa/11357947
function byteLength(str) {
	// returns the byte length of an utf8 string
	let s = str.length
	for (let i = str.length - 1; i >= 0; i--) {
		let code = str.charCodeAt(i)
		if (code > 0x7f && code <= 0x7ff) s++
		else if (code > 0x7ff && code <= 0xffff) s += 2
		if (code >= 0xDC00 && code <= 0xDFFF) i-- //trail surrogate
	}
	return s
}


module.exports = router