/*
 * CMPS 128 Fall 2018
 * Homework 4 - Causally and Eventually Consistent Key Value Store with Sharding 
 * Team: Colin Maher
 */

'use strict';

const express = require('express')
const router = express.Router()
const fetch = require('isomorphic-fetch')
const request = require('request')

const hash = {}
const key_vc = {}
const process_ip = process.env.IP_PORT
let system_view = process.env.VIEW
let num_shards = process.env.S
let ip_array = []
let shard_ids = {}
let my_shard_id


const jsdom = require('jsdom');
const {
	JSDOM
} = jsdom;
const {
	window
} = new JSDOM();
const {
	document
} = (new JSDOM('')).window;
global.document = document;

const $ = require('jquery')(window);

function hashString(ip) {
	let sum = 0
	for (let i = 0; i < ip.length; i++) {
		sum += ip.charCodeAt(i)
	}
	// console.log("sum: " + sum + " num shards: " + parseInt(num_shards))
	return sum % parseInt(num_shards)
}

function generateShardIds() {
	const ids = []
	for (let key in shard_ids) {
		ids.push(key)
	}
	return ids.join(',')
}

function initShards() {
	my_shard_id = hashString(process_ip)
	shard_ids = {}
	for (let i = 0; i < num_shards; i++) {
		shard_ids[i] = []
	}
	shardIps()
}

function shardIps() {
	for (let i = 0; i < ip_array.length; i++) {
		// console.log(hashString(ip_array[i]))
		const ip_hash = hashString(ip_array[i])
		if(shard_ids[ip_hash]){
			shard_ids[ip_hash].push(ip_array[i])
		}else{
			shard_ids[ip_hash] = [].push(ip_array[i])
		}
	}
}

ip_array = system_view.split(',')
initShards()
console.log("shard id: " + my_shard_id)

router.use(function (req, res, next) {
	console.log('Request URL:', req.protocol + "://" + req.get('host') + req.originalUrl)
	console.log("My IP: " + process_ip)
	console.log("VIEW: " + system_view)
	// shard_id = ip_array.size() % num_shards
	next()
})

function broadcast(req, method, data, receivers) {
	for (let index in receivers) {
		if (receivers[index] != process_ip) {
			//prep data for broadcast
			console.log(data)
			let encoded_data = $.param(data)

			let params = {
				headers: {
					"content-type": "application/x-www-form-urlencoded"
				},
				body: encoded_data,
				method: method
			}
			console.log(receivers[index])
			console.log("request: " + req.protocol + "://" + receivers[index] + req.originalUrl)
			fetch(req.protocol + "://" + receivers[index] + req.originalUrl, params)
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

// sharding routes
router.get('/shard/my_id', (req, res) => {
	res.status(200).json({
		'id': my_shard_id,
	})
})

router.get('/shard/all_ids', (req, res) => {
	res.status(200).json({
		'result': 'Success',
		'shard_ids': generateShardIds(),
	})
})

router.get('/shard/members/:id', (req, res) => {
	const id = req.params.id
	if (shard_ids.hasOwnProperty(id)) {
		res.status(200).json({
			'result': 'Success',
			'members': shard_ids[id].join(','),
		})
	} else {
		res.status(404).json({
			'result': 'Error',
			'msg': 'No shard with id ' + id
		})
	}
})

router.get('/shard/count/:id', (req, res) => {
	const id = req.params.id
	if (shard_ids.hasOwnProperty(id)) {
		res.status(200).json({
			'result': 'Success',
			'Count': shard_ids[id].length,
		})
	} else {
		res.status(404).json({
			'result': 'Error',
			'msg': 'No shard with id ' + id,
		})
	}
})

function checkValidShard(num) {
	const mod_count = {}
	for (let i = 0; i < num; i++) {
		mod_count[i] = 0
	}
	for (let i = 0; i < ip_array.length; i++) {
		mod_count[i % num]++
		// console.log(mod_count[i % num])
	}
	for (let i = 0; i < num; i++) {
		if (mod_count[i] <= 1) { // not fault tolerant with fewer one or fewer nodes in a shard
			return false
		}
	}
	return true
}

router.put('/shard/changeShardNumber', (req, res) => {
	const new_shard_num = req.body.num
	if (!checkValidShard(new_shard_num)) {
		res.status(400).json({
			'result': 'Error',
			'msg': 'Not enough nodes. ' + new_shard_num + ' shards results in a non-fault tolerant shard',
		})
	} else if (new_shard_num > ip_array.length){
		res.status(400).json({
			'result': 'Error',
			'msg': 'Not enough nodes for number of shards',
		})
	} else {
		if (!req.body.received) {
			let data = {
				received: true,
				num: req.body.num,
			}
			broadcast(req, 'PUT', data, ip_array)
		}
		num_shards = new_shard_num
		initShards()
		res.status(200).json({
			'result': 'Success',
			'shard_ids': generateShardIds()
		})
	}
	// need to rebalance nodes among shards here
	rebalanceData(req.protocol + "://")
})

function rebalanceData(url_base) {
	for (let key in hash) {
		// everyone sends their data to where it belongs
		const key_hash = hashString(key)
		const encoded_data = $.param({
			val: hash[key],
			payload: key_vc
		})
		const params = {
			headers: {
				"content-type": "application/x-www-form-urlencoded"
			},
			body: encoded_data,
			method: 'PUT'
		}
		shard_ids[key_hash].forEach((ip) => {
			fetch(url_base + ip + "/keyValue-store/" + key, params)
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
		})

		// everyone removes data that does not hash to their shard id
		if (key_hash !== my_shard_id) {
			delete hash[key]
			delete key_vc[key]
		}
	}
}

function initializeNewNode(urlbase) {
	for (let key in hash) {
		let data = {
			val: hash[key],
			payload: key_vc,
			received: true
		}
		let encoded_data = $.param(data)
		let params = {
			headers: {
				"content-type": "application/x-www-form-urlencoded"
			},
			body: encoded_data,
			method: 'PUT'
		}
		fetch(urlbase + key, params).then(res => {
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

// View routes
router.get('/view', (req, res) => {
	res.status(200).json({
		'view': ip_array,
	})
})

router.put('/view', (req, res) => {
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

	} else if (ip_array.includes(ip)) {
		res.status(404).json({
			'result': 'Error',
			'msg': ip + " is already in view"
		})
	} else if (req.body.received) {
		system_view = system_view.concat(",", ip)
		ip_array.push(ip)
		shard_ids[ip] = hashString(ip)
		console.log("added " + ip + " to view")
		res.status(200).json({
			'result': 'Success',
			'msg': "Successfully added " + ip + " to view"
		})
	} else {
		system_view = system_view.concat(",", ip)
		ip_array.push(ip)
		shard_ids[ip] = hashString(ip)
		console.log(system_view)
		console.log(system_view.split(','))
		console.log(ip_array)
		let data = {
			received: true,
			ip_port: ip
		}
		broadcast(req, 'PUT', data, ip_array)
		console.log('initialize url: ' + req.protocol + "://" + ip + '/keyValue-store/')
		initializeNewNode(req.protocol + "://" + ip + '/keyValue-store/')
		res.status(200).json({
			'result': 'Success',
			'msg': "Successfully added " + ip + " to view"
		})
	}

})

router.delete('/view', (req, res) => {
	let ip = req.body.ip_port

	//need to rebalance nodes among shards here

	if (!ip.match(/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]):[0-9]+$/)) {
		res.status(404).json({
			'result': 'Error',
			'msg': ip + " is not a valid IP"
		})
	} else if (ip_array.includes(req.body.ip_port)) {
		if (!req.body.received) {
			let data = {
				received: true,
				ip_port: req.body.ip_port
			}
			broadcast(req, 'DELETE', data, ip_array)
		}
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
	// remove ip from shard_ids
	shard_ids[hashString(ip)].filter(current_ip => current_ip !== ip)
	ip_array = ip_array.filter(current_ip => current_ip !== ip);
	system_view = ip_array.join(',')
}

// Search routes
router.get('/keyValue-store/search/:key', (req, res) => {
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
router.put('/keyValue-store/:key', (req, res) => {
	const key = req.params.key
	const payload = req.body.payload
	const value = req.body.val
	const key_hash = hashString(key)

	console.log(req.body)
	console.log(req.is())
	console.log("key: " + key)
	console.log(value)
	console.log(JSON.stringify(payload))

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
	} else if (key_hash === my_shard_id) { // if key belongs with me
		if (!req.body.received) { // if not already broadcasted 
			if (key in hash) { // increment vector clock
				key_vc[key].value += 1
				key_vc[key].timestamp = Date.now()
				res.status(201).json({
					'replaced': true,
					'msg': 'Updated successfully',
					'payload': key_vc,
				})
			} else {
				key_vc[key] = { // init vector clock for that key
					value: 1,
					timestamp: Date.now()
				}
				res.status(200).json({
					'replaced': false,
					'msg': 'Added successfully',
					'payload': key_vc,
				})
			}
			hash[key] = value;
			let data = {
				val: value,
				payload: key_vc,
				received: true
			}
			broadcast(req, 'PUT', data, shard_ids[key_hash]) // send to nodes that share same shard id
		} else {
			key_vc[key] = payload[key] // if data has already been broadcasted then keep the timestamp of first write
			if (key in hash) {
				res.status(201).json({
					'replaced': true,
					'msg': 'Updated successfully',
					'payload': key_vc,
				})
			} else {
				res.status(200).json({
					'replaced': false,
					'msg': 'Added successfully',
					'payload': key_vc,
				})
			}
			hash[key] = value;
		}
	} else { // if key doesn't belong to me send it to nodes its belongs to
		// check if key exists on nodes that share its hash
		const randIndex = Math.floor(Math.random() * shard_ids[key_hash].length)
		const r = request.put({
			url: req.protocol + "://" + shard_ids[key_hash][randIndex] + "/keyValue-store/" + key,
			json: $.param(req.body)
		}, function(err,httpResponse,body){
			if(err){
				console.log("Connection Refused")
			}
			req.pipe(r).pipe(res)
		})		
	}
})

router.get('/keyValue-store/:key', (req, res) => {
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

router.delete('/keyValue-store/:key', (req, res) => {
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