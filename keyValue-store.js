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

//needed for $.param function
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

function hashString(ip, num) {
	let sum = 0
	for (let i = 0; i < ip.length; i++) {
		sum += ip.charCodeAt(i)
	}
	// console.log("sum: " + sum + " num shards: " + parseInt(num_shards))
	return sum % parseInt(num)
}

function generateShardIds() {
	const ids = []
	for (let key in shard_ids) {
		ids.push(key)
	}
	return ids.join(',')
}

function initShards() {
	// console.log("initShards called")
	my_shard_id = hashString(process_ip, num_shards)
	shard_ids = {}
	for (let i = 0; i < num_shards; i++) {
		shard_ids[i] = []
	}
	shardIps()
}

function shardIps() {
	for (let i = 0; i < ip_array.length; i++) {
		// console.log(hashString(ip_array[i]))
		const ip_hash = hashString(ip_array[i], num_shards)
		if (shard_ids[ip_hash]) {
			shard_ids[ip_hash].push(ip_array[i])
		} else {
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
		mod_count[hashString(ip_array[i], num)]++
		console.log(mod_count[hashString(ip_array[i], num)])
	}
	for (let i = 0; i < num; i++) {
		if (mod_count[i] <= 1) { // not fault tolerant with one or fewer nodes in a shard
			return false
		}
	}
	return true
}

router.put('/shard/changeShardNumber', (req, res) => {
	const new_num_shards = req.body.num
	console.log("in changeShardNumber")
	console.log(req.body.payload)
	if (!checkValidShard(new_num_shards)) {
		res.status(400).json({
			'result': 'Error',
			'msg': 'Not enough nodes. ' + new_num_shards + ' shards results in a non-fault tolerant shard',
		})
	} else if (new_num_shards > ip_array.length) {
		res.status(400).json({
			'result': 'Error',
			'msg': 'Not enough nodes for number of shards',
		})
	} else {
		if (!req.body.received) {
			let data = {
				received: true,
				num: new_num_shards,
			}
			broadcast(req, 'PUT', data, ip_array)
		}
		num_shards = new_num_shards
		console.log("new num shards: " + num_shards)
		initShards()
		// console.log(req.body.payload)

		rebalanceData(req.protocol + "://", req.body.payload)
		res.status(200).json({
			'result': 'Success',
			'shard_ids': generateShardIds()
		})
	}
})

function rebalanceData(url_base, payload) {
	for (let key in hash) { // sends each key value to where it belongs
		const key_hash = hashString(key, num_shards)
		console.log(key_hash)
		console.log(payload)
		const encoded_data = $.param({
			val: hash[key],
			payload: payload,
			received: true
		})
		const params = {
			headers: {
				"content-type": "application/x-www-form-urlencoded"
			},
			body: encoded_data,
			method: 'PUT'
		}
		shard_ids[key_hash].filter((ip) => ip !== process_ip).forEach((ip) => {
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

//maybe need to change
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
	const ip_hash = hashString(ip, num_shards)
	//check for valid ip
	if (!ip.match(/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]):[0-9]+$/)) {
		res.status(404).json({
			'result': 'Error',
			'msg': ip + " is not a valid IP"
		})

	}
	if (ip_array.includes(ip)) {
		res.status(404).json({
			'result': 'Error',
			'msg': ip + " is already in view"
		})
	}
	shard_ids[ip_hash].push(ip)
	if (ip_hash == my_shard_id) { // if new node hashes to my id 
		if (req.body.received) { // if already broadcasted don't rebroadcast
			ip_array.push(ip)
			system_view = system_view.concat(",", ip)
			res.status(200).json({
				'result': 'Success',
				'msg': "Successfully added " + ip + " to view"
			})
		} else { // otherise we initialize this node with self and broadcast to all others
			initializeNewNode(req.protocol + "://")
			let data = {
				received: true,
				ip_port: ip,
			}
			broadcast(req, 'PUT', data, ip_array)
			ip_array.push(ip)
			system_view = system_view.concat(",", ip)
			console.log('initialize url: ' + req.protocol + "://" + ip + '/keyValue-store/')
			res.status(200).json({
				'result': 'Success',
				'msg': "Successfully added " + ip + " to view"
			})
		}
	} else { //if node does not match hash of new ip, then forward request to a random node that does
		const randIndex = Math.floor(Math.random() * shard_ids[ip_hash].length)
		request.put({
			url: req.protocol + "://" + shard_ids[ip_hash][randIndex] + req.originalUrl,
			form: req.body
		}).pipe(res).on('error', function (err) {
			console.log(err)
		})
	}
})
//need to decrease number of shards if a node is removed and a shard only contains 1 node
router.delete('/view', (req, res) => {
	let ip = req.body.ip_port
	// const ip_hash = hashString(ip, num_shards)
	//need to rebalance nodes among shards here
	if (!ip.match(/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]):[0-9]+$/)) {
		res.status(404).json({
			'result': 'Error',
			'msg': ip + " is not a valid IP"
		})
	} else if (ip_array.includes(ip)) {
		removeIp(ip)
		if (!req.body.received) {
			let data = {
				received: true,
				ip_port: ip
			}
			broadcast(req, 'DELETE', data, ip_array)
			for (let id in shard_ids) {
				if (shard_ids[id].length <= 1) {
					console.log("rebalancing not enough nodes in shard " + hashString(ip, num_shards))
					const new_num_shards = num_shards - 1
					req.body.num = new_num_shards
					req.body.received = false
					request.put({
						url: req.protocol + "://" + process_ip + "/shard/changeShardNumber",
						form: req.body
					}).on('error', function (err) {
						console.log(err)
					})
					break
				}
			}
		}
		// if (ip === process_ip) {
		// 	console.log("rebalancing deleted node data")
		// 	rebalanceData(req.protocol + "://", req.body.payload)
		// }
		res.status(200).json({
			'result': 'Success',
			'msg': "Successfully removed " + ip + " from view",
		})
	} else {
		res.status(404).json({
			'result': 'Error',
			'msg': ip + " is not in view"
		})
	}
})

function removeIp(ip) {
	// remove ip from shard_ids
	const ip_hash = hashString(ip, num_shards)
	shard_ids[ip_hash] = shard_ids[ip_hash].filter(current_ip => current_ip !== ip)
	ip_array = ip_array.filter(current_ip => current_ip !== ip);
	system_view = ip_array.join(',')
}

router.get('/keyValue-store/search/:key', (req, res) => {
	let key = req.params.key
	console.log(key)
	console.log(req.body)
	console.log(req.body.payload)
	let payload = req.body.payload
	const key_hash = hashString(key, num_shards)
	console.log(payload)
	payload = postmanDecodeString(payload)
	if (!canRead(payload, key)) {
		res.status(404).json({
			'result': 'Error',
			'msg': 'Cannot read',
			'payload': payload,
		})
	}
	if (key_hash === my_shard_id) {
		if (key in hash) {
			res.status(200).json({
				'isExists': true,
				'result': 'Success',
				'payload': payload,
				'owner': my_shard_id
			})
		} else {
			res.status(200).json({
				'isExists': false,
				'result': 'Success',
				'payload': payload,
			})
		}
	} else {
		const randIndex = Math.floor(Math.random() * shard_ids[key_hash].length)
		request.get({
			url: req.protocol + "://" + shard_ids[key_hash][randIndex] + req.originalUrl,
			form: req.body
		}).pipe(res).on('error', function (err) {
			console.log(err)
		})
	}
})

function postmanDecodeString(payload) {
	if (typeof payload === 'string') { //needed for use with postman
		if (payload === "") {
			return {}
		} else {
			console.log(payload)
			return JSON.parse(payload)
			// console.log(payload)
		}
	}
	return payload
}

//Basic operation routes
router.put('/keyValue-store/:key', (req, res) => {
	const key = req.params.key
	let payload = req.body.payload
	const value = req.body.val
	const key_hash = hashString(key, num_shards)

	console.log(req.body)
	console.log(req.is())
	console.log("key: " + key)
	console.log(value)
	console.log(typeof payload)
	console.log("hash of key: " + key_hash)

	payload = postmanDecodeString(payload)
	console.log('postman payload: ')
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
	} else if (key_hash === my_shard_id) { // if key belongs with me
		if (!req.body.received) { // if not already broadcasted 
			if (key in hash) { // increment vector clock
				key_vc[key].value = parseInt(key_vc[key].value) + 1
				key_vc[key].timestamp = Date.now()
				payload[key] = key_vc[key]
				res.status(201).json({
					'replaced': true,
					'msg': 'Updated successfully',
					'payload': payload,
				})
			} else {
				key_vc[key] = { // init vector clock for that key
					value: 1,
					timestamp: Date.now()
				}
				payload[key] = key_vc[key]
				res.status(200).json({
					'replaced': false,
					'msg': 'Added successfully',
					'payload': payload,
				})
			}
			hash[key] = value;
			let data = {
				val: value,
				payload: payload,
				received: true
			}
			broadcast(req, 'PUT', data, shard_ids[key_hash]) // send to nodes that share same shard id
		} else {
			key_vc[key] = payload[key] // if data has already been broadcasted then keep the timestamp of first write
			if (key in hash) {
				res.status(201).json({
					'replaced': true,
					'msg': 'Updated successfully',
					'payload': payload,
				})
			} else {
				res.status(200).json({
					'replaced': false,
					'msg': 'Added successfully',
					'payload': payload,
				})
			}
			hash[key] = value;
		}
	} else { // if key doesn't belong to me forward it to random node it belongs to
		const randIndex = Math.floor(Math.random() * shard_ids[key_hash].length)
		request.put({
			url: req.protocol + "://" + shard_ids[key_hash][randIndex] + req.originalUrl,
			form: req.body
		}).pipe(res).on('error', function (err) {
			console.log(err)
		})
	}
})

router.get('/keyValue-store/:key', (req, res) => {
	let key = req.params.key
	let payload = req.body.payload
	const key_hash = hashString(key, num_shards)
	console.log(payload)
	payload = postmanDecodeString(payload)
	// console.log(payload)
	if (key_hash === my_shard_id) {
		if (!canRead(payload, key)) {
			res.status(404).json({
				'result': 'Error',
				'msg': 'Unable to serve request and maintain causal consistency',
				'payload': payload,
			})
		}
		else if (key in hash) {
			res.status(200).json({
				'result': 'Success',
				'value': hash[key],
				'payload': payload,
			})
		} else {
			res.status(404).json({
				'result': 'Error',
				'msg': 'Key does not exist',
				'payload': payload,
			})
		}
	} else {
		const randIndex = Math.floor(Math.random() * shard_ids[key_hash].length)
		request.get({
			url: req.protocol + "://" + shard_ids[key_hash][randIndex] + req.originalUrl,
			form: req.body
		}).pipe(res).on('error', function (err) {
			console.log(err)
		})
	}
})

function canRead(payload, prop) { // determine if causal history aligns
	if (payload.hasOwnProperty(prop) && key_vc.hasOwnProperty(prop)) {
		console.log("incoming value: " + payload[prop].value)
		console.log("my value: " + key_vc[prop].value)
		console.log("incoming timestamp: " + payload[prop].timestamp)
		console.log("my timestamp: " + key_vc[prop].timestamp)
		console.log("typeof key_vc value: " + typeof key_vc[prop].value)
		console.log("typeof payload value: " + typeof payload[prop].value)
		if (payload[prop].value < key_vc[prop].value) {
			return true
		} else if (payload[prop].value > key_vc[prop].value) {
			return false
		} else {
			//check timestamp
			if (payload[prop].timestamp > key_vc[prop].timestamp) {
				return false
			} else {
				return true
			}
		}
	} else if (payload.hasOwnProperty(prop) && !key_vc.hasOwnProperty(prop)) {
		// console.log("I dont have that key")
		return false
	} else {
		return true
	}
}

router.delete('/keyValue-store/:key', (req, res) => {
	let key = req.params.key
	let payload = req.body.payload
	const key_hash = hashString(key, num_shards)
	payload = postmanDecodeString(payload)
	if (key_hash === my_shard_id) { // if this node hashes to node to delete do work
		if (key in hash) {
			if (!req.body.received) {
				let data = {
					payload: payload,
					received: true
				}
				broadcast(req, 'DELETE', data, shard_ids[key_hash])
			}
			delete hash[key]
			delete key_vc[key]
			res.status(200).json({
				'result': 'Success',
				'msg': 'Key deleted',
				'payload': payload,
			})
		} else {
			res.status(404).json({
				'result': 'Error',
				'msg': 'Key does not exist',
				'payload': payload,
			})
		}
	} else { // otherwise forward to node that can do work
		console.log("forwarding delete")
		const randIndex = Math.floor(Math.random() * shard_ids[key_hash].length)
		const r = request.delete({
			url: req.protocol + "://" + shard_ids[key_hash][randIndex] + "/keyValue-store/" + key,
			json: req.body
		}).pipe(res).on('error', function (err) {
			console.log(err)
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