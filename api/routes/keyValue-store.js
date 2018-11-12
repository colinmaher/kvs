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
const process_vc = {}
const process_ip = process.env.IP_PORT
let system_view = process.env.VIEW
let ip_array


function isProcessBehind(payload) {
	for (let prop in payload) {
		if (payload.hasOwnProperty(prop) && process_vc.hasOwnProperty(prop) && payload[prop] < process_vc[prop]) {
			return false
		}
	}
	console.log("process is behind")
	return true
}

router.use(function (req, res, next) {
	console.log('Request URL:', req.protocol + "://" + req.get('host') + req.originalUrl)
	console.log("My IP: " + process_ip)
	console.log("VIEW: " + system_view)
	ip_array = system_view.split(',')
	for (let index in ip_array) {
		if (!process_vc[ip_array[index]]) {
			process_vc[ip_array[index]] = 0
		}
	}
	next()
});

function broadcast(req, method) {
	for (let index in ip_array) {
		console.log(ip_array[index] + " " + process_ip)
		if (ip_array[index] != process_ip) {
			//prep data for broadcast
			let data = {
				received: true,
				ip_port: req.body.ip_port
			}
			let params = {
				headers: {
					"content-type": "application/json"
				},
				body: JSON.stringify(data),
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
	ip_array = system_view.split(',')
	console.log("received: " + req.body.received)
	if (!isProcessBehind(payload)) {

	} else {
		if (ip_array.includes(req.body.ip_port)) {
			res.status(404).json({
				'result': 'Error',
				'msg': req.body.ip_port + " is already in view"
			})
		} else if (req.body.received) {
			system_view = system_view.concat(",", req.body.ip_port)
			ip_array.push(req.body.ip_port)
			console.log("added " + req.body.ip_port + " to view")
			process_vc[process_ip] += 1 
			res.status(200).json({
				'result': 'Success',
				'msg': "Successfully added " + req.body.ip_port + " to view"
			})
		} else {
			console.log("default path")
			system_view = system_view.concat(",", req.body.ip_port)
			console.log(system_view)
			console.log(system_view.split(','))
			ip_array.push(req.body.ip_port)
			console.log(ip_array)
			broadcast(req, 'PUT')
			process_vc[process_ip] += 1 
			res.status(200).json({
				'result': 'Success',
				'msg': "Successfully added " + req.body.ip_port + " to view"
			})
		}
	}
})

function remove_ip(ip){
	ip_array = ip_array.filter(current_ip => current_ip !== ip);
	system_view = ip_array.join(',')
	delete process_vc[process_ip]
}

router.delete('/view/', (req, res) => {
	console.log(ip_array)
	if (!isProcessBehind(payload)) {

	} else {
		if (ip_array.includes(req.body.ip_port)) {
			broadcast(req, 'DELETE')
			remove_ip(req.body.ip_port)
			process_vc[process_ip] += 1 
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
	}
})

// Search routes
router.get('/search/:key', (req, res) => {
	let key = req.params.key
	if (key in hash) {
		res.status(200).json({
			'isExist': 'true',
			'result': 'Success',
			'payload': process_vc,
		})
	} else {
		res.status(200).json({
			'isExist': 'false',
			'result': 'Success',
			'payload': process_vc,
		})
	}

})

//Basic operation routes
router.put('/:key', (req, res) => {
	let key = req.params.key
	// console.log("key: " + key)
	let value = req.body.val
	let payload = req.body.payload

	if (!isProcessBehind(payload)) {

	} else {
		if (!keyCheck(key)) {
			res.status(404).json({
				'msg': 'Key not valid',
				'result': 'Error',
				'payload': process_vc,
			})
		} else if (valCheck(value)) {
			res.status(404).json({
				'result': 'Error',
				'msg': 'Object too large. Size limit is 1MB',
				'payload': process_vc,
			})
		} else if (value == undefined) {
			res.status(404).json({
				'msg': 'Error',
				'error': 'Value is missing',
				'payload': process_vc,
			})
		} else if (key in hash) {
			hash[key] = value;
			process_vc[process_ip] += 1 
			res.status(200).json({
				'replaced': 'True',
				'msg': 'Updated successfully',
				'payload': process_vc,
			})
		} else {
			hash[key] = value;
			process_vc[process_ip] += 1 
			res.status(201).json({
				'replaced': 'False',
				'msg': 'Added successfully',
				'payload': process_vc,
			})
		}
	}
})

router.get('/:key', (req, res) => {
	let key = req.params.key

	if (key in hash) {
		res.status(200).json({
			'result': 'Success',
			'value': hash[key],
			'payload': process_vc,
		})
	} else {
		res.status(404).json({
			'result': 'Error',
			'msg': 'Key does not exist',
			'payload': process_vc,
		})
	}
})

router.delete('/:key', (req, res) => {
	let key = req.params.key
	if (!isProcessBehind(payload)) {

	} else {
		if (key in hash) {
			delete hash[key]
			process_vc[process_ip] += 1 
			res.status(200).json({
				'result': 'Success',
				'msg': 'Key deleted',
				'payload': process_vc,
			})
		} else {
			res.status(404).json({
				'result': 'Error',
				'msg': 'Key does not exist',
				'payload': process_vc,
			})
		}
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