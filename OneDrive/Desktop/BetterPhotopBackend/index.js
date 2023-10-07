const people = {
	"6154f0d0a8d6d106c5b869b6": [
		"delete-plugin",
		"review-plugin",
		"delete-theme",
		"review-theme",
		"quick-patches",
		"theme-testing",
		"plugin-testing"
	],
	"748910218846666894": [
		"delete",
		"review"
	]
}

function checkRole(userid, role) {
	if(people[userid] && people[userid].includes(role)) {
		return true;
	}

	return;
}

const SimpleSocket = require('simple-socket-js');
const fs = require('fs');
const fetch = require('node-fetch');
const axios = require('axios')
const tf = require("@tensorflow/tfjs-node");
const nsfw = require('nsfwjs')
const webtoken = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const JSONdb = require('simple-json-db');
const db = new JSONdb('storage.json');
const plugins = new JSONdb('mainData/plugins.json');
const themes = new JSONdb('mainData/themes.json');
const tokenStorage = new JSONdb('tokenStorage.json');
const cors = require('cors');
const express = require('express');
const app = express();

const { v4: uuidv4 } = require('uuid');
const expressWS = require('express-ws')
const http = require('http');
const server = http.createServer(app).listen(3000, () => {
	console.log('Ready!')
})
expressWS(app, server)

var websockets = {};
var pluginWebsockets = {
	censorship: []
};
var userIdSession = {};
var userWebsockets = {};

module.exports = {
	themes,
	plugins,
	people,
	userWebsockets,
	websockets
}

const {sendMessage} = require('./discord.js')

const encrypt = (text) => {
  return CryptoJS.AES.encrypt(text, process.env['pass']).toString()
};
const decrypt = (data) => {
	var decrypted = CryptoJS.AES.decrypt(data, process.env['pass'])
  return decrypted.toString(CryptoJS.enc.Utf8)
};

function verifyToken(encryptedToken, tokenGiven) {
	var tokens = tokenStorage.storage['tokens'];
	if(decrypt(encryptedToken) == tokenGiven) {
		return true;
	}

	return;
}

function uppercase(string) {
	if (!string) return;
	let strings = [];
	const data = string.split('-')
	for(var i=0;i<data.length;i++) {
		strings.push(data[i].charAt(0).toUpperCase() + data[i].slice(1))
	}
	return strings.join(' ');
}
function getId(){
  let random_string = ''
  let random_ascii
  for(let i = 0; i < 8; i++) {
    random_ascii = Math.floor((Math.random() * 25) + 97)
    random_string += String.fromCharCode(random_ascii)
  }
  return random_string
}
function find(array, path, value) {
	let items = [];
	array.forEach(item => {
		if (path.includes(':')) {
			if (item[path.split(':')[0]][path.split(':')[1]] == value || (value.includes('incl') && item[path.split(':')[0]][path.split(':')[1]].includes(value.replace('incl ', '')))) {
				items.push(array.indexOf(item))
			}
		} else {
			if (item[path] == value || (value.includes('incl') && item[path].includes(value.replace('incl ', '')))) {
				items.push(array.indexOf(item))
			}
		}
	})

	return items;
}

async function request(url, method, body) {
  let data = {
    method: method,
		headers: {
			"cache": "no-cache",
			"Content-Type": "application/json"
		}
  };
  if(body){
		if (typeof body == "object" && body instanceof FormData == false) {
			body = JSON.stringify(body);
		}
    data.body = body;
  }
	let res = await fetch(url, data);
  return [res.status, await res.text()];
}

function parseVersion(numberString) {
  const periodRemovedString = numberString.replace(/\./g, '');
  const parsedInteger = parseInt(periodRemovedString, 10);
  const parsedNumberString = parsedInteger.toLocaleString();

  return parsedNumberString;
}

const corsOptions = {
  origin: ['https://better.photop.repl.co', 'https://app.photop.live', 'https://photop.robotengine.repl.co', 'https://betterphotop-web.abicamstudios.repl.co', 'https://betterphotopmarket.abicamstudios.repl.co', 'https://abooby1.github.io', 'https://67jyj6.csb.app', 'https://sktmx7.csb.app']
};
app.use(cors(corsOptions));
app.use(express.static('public'))
app.use(express.json())

const aboobySocket = new SimpleSocket({
	project_id: "6349eefe3101ef7cafd5d273",
	project_token: "client_cd547ca434101f5dd33b8944f441e0aba66"
});
const socket = new SimpleSocket({
  project_id: "61b9724ea70f1912d5e0eb11",
  project_token: "client_a05cd40e9f0d2b814249f06fbf97fe0f1d5"
});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/public/index.html')
})
app.patch('/qp', (req, res) => {
	var message = req.body['message'];
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!message) {
		message = 'Emergency Patch';
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		const verifiedPerson = (people[decoded.userid] && people[decoded.userid].includes('quick-patches'));
		if(!verifiedPerson) {
			res.status(404).send('You cant send Quick Patches.')
			return;
		}

		for(var i=0;i<Object.keys(websockets).length;i++) {
			const websocket = websockets[Object.keys(websockets)[i]]
			websocket.send(JSON.stringify({type: 'qp', message}))
		}
		res.sendStatus(200)
	})
})

//outer api
app.get('/bots/api/users', (req, res) => {
	res.send(Object.keys(tokenStorage.storage['tokens']))
})
app.get('/bots/api/has', (req, res) => {
	if(!req.query['userid']) {
		res.status(404).send('Param "userid" is needed.')
		return;
	}
	if(!req.query['id']) {
		res.status(404).send('Param "id" is needed.')
		return;
	}

	const userData = db.storage[req.query['userid']]

	if(!userData) {
		res.status(404).send('User doesnt exist.')
		return;
	}
	
	if(req.query['type'] == 'theme'){
		res.send(userData.themes.includes(req.query['id']))
	} else if(req.query['type'] == 'plugin') {
		res.send(userData.plugins.includes(req.query['id']))
	} else {
		res.status(404).send('Invalid "type" param.')
	}
})

app.post('/plugins/api/verifyToken', (req, res) => {
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		if(!decoded) {
			res.status(404).send('Invalid token.')
			return;
		}
		
		res.send(decoded.userid)
	})
})

app.get('/main/published', (req, res) => {
	let userid;
	var returnData = {
		themes: new Array(),
		plugins: new Array()
	}

	if(req.headers['auth']) {
		webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
			userid = decoded.userid;
		})
	}
	
	if(!req.query['term']) {
		const pluginKeys = Object.keys(plugins.storage)
		const themeKeys = Object.keys(themes.storage)
		
		for(let i=0;i<pluginKeys.length;i++) {
			let key = pluginKeys[i];
			let data = plugins.storage[key];
			let access;
			if(find(data.roles.owners, 'userid', userid)[0]) {
				access = true;
			} else if(find(data.roles.testers, 'userid', userid)[0]) {
				access = true;
			} else if(people[userid] && people[userid].includes('plugin-testing')) {
				access = true;
			}
			if(data.published || access) {
				data.id = key;
				returnData.plugins.push(data)
			}
		}
		for(let i=0;i<themeKeys.length;i++) {
			let key = themeKeys[i];
			let data = themes.storage[key];
			if(data.published) {
				data.id = key;
				returnData.themes.push(data)
			}
		}
	} else {
		const pluginKeys = Object.keys(plugins.storage)
		const themeKeys = Object.keys(themes.storage)
		
		for(let i=0;i<pluginKeys.length;i++) {
			let key = pluginKeys[i];
			let data = plugins.storage[key];
			let access;
			if(find(data.roles.owners, 'userid', userid)[0]) {
				access = true;
			} else if(find(data.roles.testers, 'userid', userid)[0]) {
				access = true;
			} else if(people[userid] && people[userid].includes('plugin-testing')) {
				access = true;
			}
			if((data.published || access) && data.name.toLowerCase().includes(req.query['term'].toLowerCase())) {
				data.id = key;
				returnData.plugins.push(data)
			}
		}
		for(let i=0;i<themeKeys.length;i++) {
			let key = themeKeys[i];
			let data = themes.storage[key];
			if(data.published && data.name.toLowerCase().includes(req.query['term'].toLowerCase())) {
				data.id = key;
				returnData.themes.push(data)
			}
		}
	}

	res.send(returnData)
})
//

// User Storage
app.put('/userStorage/set', async (req, res) => {
	if(!req.headers['auth']) {
		res.status(403).send('Param "header.auth" is needed.')
		return;
	}
	if(!req.body['auth']) {
		console.log('h')
		res.status(403).send('Invalid Plugin auth.')
		return;
	}
	if(!req.body['key']) {
		res.status(404).send('Param "body.key" is needed.')
		return;
	}
	if(req.body['value'] == undefined) {
		res.status(404).send('Param "body.value" is needed.')
		return;
	}

	let userid = await new Promise((res, rej) => {
		webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
			if(!decoded) {
				res()
			}
			
			res(decoded.userid)
		})
	})

	if(!userid) {
		res.status(403).send('Invalid user token.')
		return;
	}
	let userData = db.storage[userid];

	try {
		webtoken.verify(decrypt(req.body['auth']), process.env['authtokenkey'], async function(err, decoded) {
			if(!decoded) {
				res.status(403).send('Invalid Plugin auth.')
				return;
			}
			
			let plugin = plugins.storage[decoded.id];
			if(!plugin) {
				res.status(404).send('Plugin doesnt exist.')
				return;
			}

			if(userData.pluginData[plugin.id]) {
				userData.pluginData[plugin.id][req.body['key']] = req.body['value'];
			} else {
				userData.pluginData[plugin.id] = {
					[req.body['key']]: req.body['value']
				}
			}
			db.set(userid, userData)
			res.sendStatus(200)
		})
	}catch(err) {
		res.status(404).send(err)
	}
})
//

app.get('/user', async (req, res) => {
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	
	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		if(!decoded) {
			res.status(405).send('Invalid token.')
			return;
		}
		
		var userData = await db.get(decoded.userid)
		if(!userData) {
			userData = {
				plugins: [],
				themes: [],
				disabled: []
			}
	
			db.set(decoded.userid, userData)
		}
		if(!userData.themes) {
			userData.themes = [];
			db.set(decoded.userid, userData)
		}
		if(!userData.disabled) {
			userData.disabled = [];
			db.set(decoded.userid, userData)
		}
		if(!userData.pluginData) {
			userData.pluginData = {};
			db.set(decoded.userid, userData)
		}

		var formattedUserData = {
			plugins: [],
			themes: [],
			disabled: [],
			pluginData: userData.pluginData
		}

		for(let i=0;i<userData.plugins.length;i++) {
			var pluginId = userData.plugins[i];
			var formattedData = await plugins.get(pluginId);
			if(formattedData) {
				if(!formattedData.roles) {
					formattedData.roles = {
						owners: [],
						testers: []
					}
					plugins.set(pluginId, formattedData)
				}
				if(!formattedData.auth) {
					await new Promise((res, rej) => {
						webtoken.sign({ id: pluginId }, process.env['authtokenkey'], {}, async function(err, token) {
							formattedData.auth = encrypt(token)
							res()
						});
					})

					plugins.set(pluginId, formattedData)
				}
				
				formattedData.id = pluginId;
				formattedUserData.plugins.push(formattedData)
			}
		}
		for(let i=0;i<userData.themes.length;i++) {
			var themeId = userData.themes[i];
			var formattedData = themes.storage[themeId];
			if(formattedData) {
				formattedData.id = themeId;
				formattedUserData.themes.push(formattedData)
			}
		}
		for(let i=0;i<userData.disabled.length;i++) {
			var disabledId = userData.disabled[i];
			var formattedData;
			if(plugins.storage[disabledId]) {
				formattedData = await plugins.get(disabledId);
				formattedData.type = 'Plugin';
			} else if(themes.storage[disabledId]) {
				formattedData = themes.storage[disabledId];
				formattedData.type = 'Theme';
			}
			if(formattedData) {
				formattedData.id = disabledId;
				formattedUserData.disabled.push(formattedData)
			}
		}
	
		res.json({
			userData: formattedUserData,
			users: Object.keys(db.storage)
		})
	})
})

app.get('/plugins', (req, res) => {
	var pluginData = [];
	
	if(req.query['userid']) {
		var ids = db.storage[req.query['userid']].plugins;
		if(!ids) {
			res.status(404).send(`Looks like "${req.query['userid']}" doesnt exist.`)
		}
		
		for(var i=0;i<ids.length;i++) {
			var pluginId = ids[i];
			var formattedData = plugins.storage[pluginId];
			if(formattedData) {
				formattedData.id = pluginId;
				pluginData.push(formattedData)
			}
		}
	} else if(req.query['id']) {
		var formattedData = plugins.storage[req.query['id']]
		if(!formattedData) {
			res.status(404).send(`"${req.query['id']}" isnt a plugin.`)
			return;
		}

		formattedData.id = req.query['id'];
		pluginData = formattedData;
	}

	res.json(pluginData)
})
app.post('/plugins/new', (req, res) => {
	var tokens = tokenStorage.storage['tokens'];
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}

	if(!req.body['pluginName'] || req.body['pluginName'].length == 0) {
		res.status(404).send('Param "pluginName" is needed.')
		return;
	}
	if(!req.body['pluginDesc'] || req.body['pluginDesc'].length == 0) {
		res.status(404).send('Param "pluginDesc" is needed.')
		return;
	}
	if(!req.body['author'] || req.body['author'].length == 0) {
		res.status(404).send('Param "author" is needed.')
		return;
	}
	if(!req.body['script'] || req.body['script'].length == 0) {
		res.status(404).send('Param "script" is needed.')
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		var plugin = {
			id: getId(),
			name: req.body['pluginName'],
			description: req.body['pluginDesc'],
			version: '1.0.0',
			author: {
				name: req.body['author'],
				userid: decoded.userid
			},
			installed: 1,
			image: req.body['pluginImage'],
			origin: req.body['script'],
			roles: {
				owners: [],
				testers: [],
				bpTesters: []
			}
		}

		await new Promise((res, rej) => {
			webtoken.sign({ id: plugin.id }, process.env['authtokenkey'], {}, async function(err, token) {
				plugin.auth = encrypt(token)
				res()
			});
		})

		plugin.script = `https://betterphotopholder.abicamstudios.repl.co/pluginCode/${plugin.id}.js`

		var userData = db.storage[decoded.userid];
		userData.plugins.push(plugin.id)
		db.set(decoded.userid, userData)

		request('https://betterphotopholder.abicamstudios.repl.co/code', 'POST', {
			pass: process.env['sendPass'],
			id: plugin.id,
			type: 'plugin',
			script: plugin.origin
		})

		plugins.set(plugin.id, plugin)
		res.send('Plugin Created!')
	})
})
app.put('/plugins/update', (req, res) => {
	var tokens = tokenStorage.storage['tokens'];
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['pluginId']) {
		res.status(404).send('Param "pluginId" is needed.')
		return;
	}

	var plugin = plugins.storage[req.body['pluginId']]
	if(!plugin) {
		res.status(404).send(`"${req.body['pluginId']}" doesnt exist.`)
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		if(decoded.userid != plugin.author.userid && find(plugin.roles.owners, 'userid', decoded.userid).length == 0) {
			res.status(404).send('Youre not an owner of this plugin.')
			return;
		}

		if(req.body['version'].length == 0) {
			res.status(404).send('Version is needed.')
			return;
		}

		const formatVersion = function() {
			const versionParts = plugin.version.split('.')
			switch(req.body['version']) {
				case 'patchUpdate':
					return `${versionParts[0]}.${versionParts[1]}.${parseInt(versionParts[2]) + 1}`;
				case 'minorUpdate':
					return `${versionParts[0]}.${parseInt(versionParts[1]) + 1}.0`;
				case 'majorUpdate':
					return `${parseInt(versionParts[0]) + 1}.0.0`;
				default:
					return plugin.version;
			}
		}

		if(formatVersion() == plugin.version) {
			res.status(404).send('Please pick either "patchUpdate", "minorUpdate", or "majorUpdate" as the version param.')
			return;
		}

		if(req.body['changelog'].length > 0) {
			plugin.changelog = req.body['changelog'].replaceAll('\n', '<br>');
		}
		plugin.version = formatVersion();
		plugin.updateReview = true;

		request('https://betterphotopholder.abicamstudios.repl.co/code', 'POST', {
			pass: process.env['sendPass'],
			id: plugin.id,
			type: 'plugin',
			script: plugin.origin
		})

		plugins.set(req.body['pluginId'], plugin);
		sendMessage('Plugin', 'Updated', plugin.id)
		res.send(plugin.version)
	})
})
app.put('/plugins/publish', (req, res) => {
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['pluginId']) {
		res.status(404).send('Param "pluginId" is needed.')
		return;
	}

	var plugin = plugins.storage[req.body['pluginId']]
	if(!plugin) {
		res.status(404).send(`"${req.body['pluginId']}" doesnt exist.`)
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		if(decoded.userid != plugin.author.userid && find(plugin.roles.owners, 'userid', decoded.userid).length == 0) {
			res.status(404).send('Youre not an owner of this plugin.')
			return;
		}
		if(plugin.published) {
			res.status(404).send('Plugin is already published.')
			return;
		}

		plugin.published = true;
		plugins.set(plugin.id, plugin);

		sendMessage('Plugin', 'Published', plugin.id)
		res.send('Plugin successfully published!')
	})
})
app.patch('/plugins/review', (req, res) => {
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['pluginId']) {
		res.status(404).send('Param "pluginId" is needed.')
		return;
	}

	var plugin = plugins.storage[req.body['pluginId']]
	if(!plugin) {
		res.status(404).send(`"${req.body['pluginId']}" doesnt exist.`)
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		const verifiedPerson = (people[decoded.userid] && people[decoded.userid].includes('review-plugin'));
		if(!verifiedPerson) {
			res.status(404).send('Youre not able to review plugins.')
			return;
		}
		if(plugin.reviewed && !plugin.updateReview) {
			res.status(404).send('Plugin is already reviewed.')
			return;
		}

		plugin.reviewed = true;
		plugin.updateReview = false;
		plugins.set(plugin.id, plugin)
		res.send('Plugin has been reviewed!')
	})
})
app.put('/plugins/settings', (req, res) => {
	var tokens = tokenStorage.storage['tokens'];
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['pluginId']) {
		res.status(404).send('Param "pluginId" is needed.')
		return;
	}

	var plugin = plugins.storage[req.body['pluginId']]
	if(!plugin) {
		res.status(404).send(`"${req.body['pluginId']}" doesnt exist.`)
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		if(decoded.userid != plugin.author.userid && find(plugin.roles.owners, 'userid', decoded.userid).length == 0) {
			res.status(404).send('Youre not an owner of this plugin.')
			return;
		}

		if(req.body['script']) {
			plugin.origin = req.body['script'];
		}
		if(req.body['name']) {
			plugin.name = req.body['name'];
		}
		if(req.body['description']) {
			plugin.description = req.body['description'];
		}
		if(req.body['image']) {
			plugin.image = req.body['image'];
		}
		if(req.body['backendLink']) {
			plugin.backendLink = req.body['backendLink'];
		}

		plugin.updateReview = true;

		plugins.set(plugin.id, plugin);
		sendMessage('Plugin', 'Updated', plugin.id)
		res.send('Successfully updated plugin settings!')
	})
})
app.put('/plugins/roles', (req, res) => {
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['pluginId']) {
		res.status(404).send('Param "pluginId" is needed.')
		return;
	}
	if(!req.body['data']) {
		res.status(404).send('Param "data" is needed.')
		return;
	}
	if(!req.body['type']) {
		res.status(404).send('Param "type" is needed as "ownerRole" or "testerRole".')
		return;
	}

	var plugin = plugins.storage[req.body['pluginId']]
	if(!plugin) {
		res.status(404).send(`"${req.body['pluginId']}" doesnt exist.`)
		return;
	}

	if(req.body['type'] == 'testerRole' && find(plugin.roles.owners, 'userid', req.body['data'].userid).length > 0) {
		plugin.roles.owners.splice(plugin.roles.owners.indexOf(req.body['data']), 1)
	}
	if(req.body['type'] == 'ownerRole' && find(plugin.roles.testers, 'userid', req.body['data'].userid).length > 0) {
		plugin.roles.testers.splice(plugin.roles.testers.indexOf(req.body['data']), 1)
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
    var userData = db.storage[decoded.userid];

		switch(req.body['type']) {
			case 'ownerRole':
				if(decoded.userid != plugin.author.userid) {
					res.status(404).send('Your not the author of this plugin.')
					return;
				}
				if(find(plugin.roles.owners, 'userid', req.body['data'].userid).length > 0) {
					plugin.roles.owners.splice(plugin.roles.owners.indexOf(req.body['data']), 1)
					res.status(201).send('Users owner role has been removed.')
				} else {
					plugin.roles.owners.push(req.body['data'])
					res.status(200).send('Users owner role has been granted.')
				}
				break;
			case 'testerRole':
				if(decoded.userid != plugin.author.userid && find(plugin.roles.owners, 'userid', decoded.userid).length == 0) {
					res.status(404).send('Your not an owner of this plugin.')
					return;
				}
				if(find(plugin.roles.testers, 'userid', req.body['data'].userid).length > 0) {
					plugin.roles.testers.splice(plugin.roles.testers.indexOf(req.body['data']), 1)
					res.status(201).send('Users tester role has been removed.')
				} else {
					plugin.roles.testers.push(req.body['data'])
					res.status(200).send('Users tester role has been granted.')
				}
				break;
		}

		plugins.set(plugin.id, plugin)
	})
})

app.delete('/plugins/disable', (req, res) => {
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['pluginId']) {
		res.status(404).send('Param "pluginId" is needed.')
		return;
	}

	var plugin = plugins.storage[req.body['pluginId']]
	if(!plugin) {
		res.status(404).send(`"${req.body['pluginId']}" doesnt exist.`)
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
    var userData = db.storage[decoded.userid];

		if(userData.disabled.includes(plugin.id)) {
			userData.disabled.splice(userData.disabled.indexOf(plugin.id), 1)
			userData.plugins.push(plugin.id)
			db.set(decoded.userid, userData)
		} else {
			userData.disabled.push(plugin.id)
			userData.plugins.splice(userData.plugins.indexOf(plugin.id), 1)
			db.set(decoded.userid, userData)
		}

		res.sendStatus(200)
	})
})
app.delete('/plugins/delete', (req, res) => {
	var tokens = tokenStorage.storage['tokens'];
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['pluginId']) {
		res.status(404).send('Param "pluginId" is needed.')
		return;
	}

	var plugin = plugins.storage[req.body['pluginId']]
	if(!plugin) {
		res.status(404).send(`"${req.body['pluginId']}" doesnt exist.`)
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		const verifiedPerson = (people[decoded.userid] && people[decoded.userid].includes('delete-plugin'));
		if(decoded.userid != plugin.author.userid && !verifiedPerson) {
			res.status(404).send('Youre not the creator of this plugin.')
			return;
		}

		request('https://betterphotopholder.abicamstudios.repl.co/delete', 'DELETE', {
			id: plugin.id,
			type: 'plugin',
			pass: process.env['sendPass']
		})

		plugins.delete(plugin.id);
		res.send("Successfully deleted plugin!")
	})
})
app.put('/plugins/install', (req, res) => {
	var tokens = tokenStorage.storage['tokens'];
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['pluginId']) {
		res.status(404).send('Param "pluginId" is needed.')
		return;
	}

	var plugin = plugins.storage[req.body['pluginId']]
	if(!plugin) {
		res.status(404).send(`"${req.body['pluginId']}" doesnt exist.`)
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		let role;
		if(find(plugin.roles.owners, 'userid', decoded.userid)[0]) {
			role = true;
		} else if(find(plugin.roles.testers, 'userid', decoded.userid)[0]) {
			role = true;
		} else if(people[decoded.userid] && people[decoded.userid].includes('plugin-testing')) {
			role = true;
		}
		
		var userData = db.storage[decoded.userid];
		if(userData.plugins.includes(req.body['pluginId'])) {
			res.status(404).send('Plugin has already been installed.')
			return;
		}
		if(!plugin.published && !role) {
			res.status(404).send('This plugin isnt public.')
			return;
		}

		plugin.installed++;
		plugins.set(plugin.id, plugin)
		userData.plugins.push(req.body['pluginId'])
		db.set(decoded.userid, userData)
		res.send('Successfully installed plugin!')
	})
})
app.delete('/plugins/uninstall', (req, res) => {
	var tokens = tokenStorage.storage['tokens'];
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['pluginId']) {
		res.status(404).send('Param "pluginId" is needed.')
		return;
	}

	var plugin = plugins.storage[req.body['pluginId']]
	if(!plugin) {
		res.status(404).send(`"${req.body['pluginId']}" doesnt exist.`)
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		var userData = db.storage[decoded.userid];
		if(!userData.plugins.includes(req.body['pluginId'])) {
			res.status(404).send('User doesnt have this plugin downloaded.')
			return;
		}

		plugin.installed--;
		plugins.set(plugin.id, plugin)
		userData.plugins.splice(userData.plugins.indexOf(req.body['pluginId']), 1)
		if(userData.disabled.includes(req.body['pluginId'])) {
			userData.disabled.splice(userData.disabled.indexOf(req.body['pluginId']), 1)
		}
		db.set(decoded.userid, userData)
		res.send('Successfully uninstalled plugin!')
	})
})

//themes
app.get('/themes', (req, res) => {
	var themeData = [];

	if(req.query['userid']) {
		let userData = db.storage[req.query['userid']];
		if(!userData.themes) {
			userData.themes = [];
		}

		for(var i=0;i<userData.themes.length;i++) {
			const theme = themes.storage[userData.themes[i]];
			if(theme) {
				themeData.push(theme)
			}
		}
	}
	if(req.query['id']) {
		const theme = themes.storage[req.query['id']];
		if(theme) {
			themeData.push(theme)
		}
	}

	res.send(themeData)
})
app.post('/themes/new', (req, res) => {
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	
	if(!req.body['themeName'] || req.body['themeName'].length == 0) {
		res.status(404).send('Param "themeName" is needed.')
		return;
	}
	if(!req.body['author'] || req.body['author'].length == 0) {
		res.status(404).send('Param "author" is needed.')
		return;
	}
	if(!req.body['script'] || req.body['script'].length == 0) {
		res.status(404).send('Param "script" is needed.')
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		var theme = {
			id: getId(),
			name: req.body['themeName'],
			author: {
				name: req.body['author'],
				userid: decoded.userid
			},
			installed: 1,
			image: req.body['themeImage'],
			origin: req.body['script']
		}

		theme.script = `https://betterphotopholder.abicamstudios.repl.co/themeCode/${theme.id}.css`

		var userData = db.storage[decoded.userid];
		userData.themes.push(theme.id)
		db.set(decoded.userid, userData)

		request('https://betterphotopholder.abicamstudios.repl.co/code', 'POST', {
			pass: process.env['sendPass'],
			id: theme.id,
			type: 'theme',
			script: theme.origin
		})

		themes.set(theme.id, theme)
		res.send('Theme Created!')
	})
})
app.put('/themes/update', (req, res) => {
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['themeId']) {
		res.status(404).send('Param "themeId" is needed.')
		return;
	}

	var theme = themes.storage[req.body['themeId']]
	if(!theme) {
		res.status(404).send(`"${req.body['themeId']}" doesnt exist.`)
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		if(decoded.userid != theme.author.userid) {
			res.status(404).send('Youre not the creator of this theme.')
			return;
		}
		
		request('https://betterphotopholder.abicamstudios.repl.co/code', 'POST', {
			pass: process.env['sendPass'],
			id: theme.id,
			type: 'theme',
			script: theme.origin
		})

		theme.updateReview = true;

		themes.set(theme.id, theme)
		sendMessage('Theme', 'Updated', theme.id)
		res.send('Successfully updated theme!')
	})
})
app.put('/themes/publish', (req, res) => {
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['themeId']) {
		res.status(404).send('Param "themeId" is needed.')
		return;
	}

	var theme = themes.storage[req.body['themeId']]
	if(!theme) {
		res.status(404).send(`"${req.body['themeId']}" doesnt exist.`)
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		if(decoded.userid != theme.author.userid) {
			res.status(404).send('Youre not the creator of this theme.')
			return;
		}
		if(theme.published) {
			res.status(404).send('Theme is already published.')
			return;
		}

		theme.published = true;
		themes.set(theme.id, theme);
		sendMessage('Theme', 'Published', theme.id)
		res.send('Theme successfully published!')
	})
})
app.patch('/themes/review', (req, res) => {
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['themeId']) {
		res.status(404).send('Param "themeId" is needed.')
		return;
	}

	var theme = themes.storage[req.body['themeId']]
	if(!theme) {
		res.status(404).send(`"${req.body['themeId']}" doesnt exist.`)
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		const verifiedPerson = (people[decoded.userid] && people[decoded.userid].includes('review-theme'));
		if(!verifiedPerson) {
			res.status(404).send('Youre not able to review themes.')
			return;
		}
		if(theme.reviewed && !theme.updateReview) {
			res.status(404).send('Theme is already reviewed.')
			return;
		}

		theme.reviewed = true;
		theme.updateReview = false;
		themes.set(theme.id, theme)
		res.send('Theme has been reviewed!')
	})
})
app.put('/themes/settings', (req, res) => {
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['themeId']) {
		res.status(404).send('Param "themeId" is needed.')
		return;
	}

	var theme = themes.storage[req.body['themeId']]
	if(!theme) {
		res.status(404).send(`"${req.body['themeId']}" doesnt exist.`)
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		if(decoded.userid != theme.author.userid) {
			res.status(404).send('Youre not the creator of this theme.')
			return;
		}

		if(req.body['script']) {
			theme.origin = req.body['script'];
		}
		if(req.body['name']) {
			theme.name = req.body['name'];
		}
		if(req.body['image']) {
			theme.image = req.body['image'];
		}

		theme.updateReview = true;
		
		themes.set(theme.id, theme);
		sendMessage('Theme', 'Updated', theme.id)
		res.send('Successfully updated theme settings!')
	})
})
app.delete('/themes/disable', (req, res) => {
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['themeId']) {
		res.status(404).send('Param "themeId" is needed.')
		return;
	}

	var theme = themes.storage[req.body['themeId']]
	if(!theme) {
		res.status(404).send(`"${req.body['themeId']}" doesnt exist.`)
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
    var userData = db.storage[decoded.userid];

		if(userData.disabled.includes(theme.id)) {
			userData.disabled.splice(userData.disabled.indexOf(theme.id), 1)
			userData.themes.push(theme.id)
			db.set(decoded.userid, userData)
		} else {
			userData.disabled.push(theme.id)
			userData.themes.splice(userData.themes.indexOf(theme.id), 1)
			db.set(decoded.userid, userData)
		}

		res.sendStatus(200)
	})
})
app.delete('/themes/delete', (req, res) => {
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['themeId']) {
		res.status(404).send('Param "themeId" is needed.')
		return;
	}

	var theme = themes.storage[req.body['themeId']]
	if(!theme) {
		res.status(404).send(`"${req.body['themeId']}" doesnt exist.`)
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		const verifiedPerson = (people[decoded.userid] && people[decoded.userid].includes('delete-theme'));
		if(decoded.userid != theme.author.userid && !verifiedPerson) {
			res.status(404).send('Youre not the creator of this theme.')
			return;
		}

		request('https://betterphotopholder.abicamstudios.repl.co/delete', 'DELETE', {
			id: theme.id,
			type: 'theme',
			pass: process.env['sendPass']
		})

		themes.delete(theme.id);
		res.send("Successfully deleted theme!")
	})
})
app.put('/themes/install', (req, res) => {
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['themeId']) {
		res.status(404).send('Param "themeId" is needed.')
		return;
	}

	var theme = themes.storage[req.body['themeId']]
	if(!theme) {
		res.status(404).send(`"${req.body['themeId']}" doesnt exist.`)
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		var userData = db.storage[decoded.userid];
		if(userData.themes.includes(req.body['themeId'])) {
			res.status(404).send('Theme has already been installed.')
			return;
		}

		theme.installed++;
		themes.set(theme.id, theme)
		userData.themes.push(req.body['themeId'])
		db.set(decoded.userid, userData)
		res.send('Successfully downloaded theme!')
	})
})
app.delete('/themes/uninstall', (req, res) => {
	if(!req.headers['auth']) {
		res.status(404).send('Header "auth" is needed.')
		return;
	}
	if(!req.body['themeId']) {
		res.status(404).send('Param "themeId" is needed.')
		return;
	}

	var theme = themes.storage[req.body['themeId']]
	if(!theme) {
		res.status(404).send(`"${req.body['themeId']}" doesnt exist.`)
		return;
	}

	webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
		var userData = db.storage[decoded.userid];
		if(!userData.themes.includes(req.body['themeId'])) {
			res.status(404).send('User doesnt have this theme downloaded.')
			return;
		}

		theme.installed--;
		themes.set(theme.id, theme)
		userData.themes.splice(userData.themes.indexOf(req.body['themeId']), 1)
		db.set(decoded.userid, userData)
		res.send('Successfully uninstalled theme!')
	})
})

//
const roleExclude = [
	'Owner',
	'Verified',
	'Trail Moderator',
	'Moderator',
	'Developer',
	'Admin'
]
socket.subscribe({
	task: 'general',
	location: 'home',
	fullNew: true
}, async function(data) {
	if(data.type == 'newpost') {
		let [code, postData] = await request('https://photop.exotek.co/posts?postid=' + data.post._id, 'GET');
		if(code == 200) {
			postData = JSON.parse(postData)
		
			let [code2, userData] = await request('https://photop.exotek.co/user?id=' + postData.UserID, 'GET')
			if(code2 == 200) {
				userData = JSON.parse(userData)
				if(userData.Role && typeof userData.Role == 'string') {
					userData.Role = [userData.Role];
				}
			} else {
				userData = null;
			}
			
			postData = postData.posts[0];
			try {
				if(userData && userData.ProfileData.Followers >= 100) return;
				if(userData && roleExclude.includes(userData.Role[0])) return;
				if (postData.Media) {
					for (let i = 0; i < postData.Media.ImageCount; i++) {
						const pic = await axios.get(
							`https://photop-content.s3.amazonaws.com/PostImages/${postData._id}${i}`,
							{
								responseType: "arraybuffer"
							}
						);
						const model = await nsfw.load();
						const image = await tf.node.decodeImage(pic.data, 3);
						const predictions = await model.classify(image);
						image.dispose();
						if (
							predictions[0].probability >= 0.9 &&
							(predictions[0].className == "Porn" || predictions[0].className == 'Hentai')
						) {
							for(let i=0;i<pluginWebsockets.censorship.length;i++) {
								pluginWebsockets.censorship[i].send(JSON.stringify({
									type: 'censor',
									postid: postData._id
								}))
							}
						}
					}
				}
			}catch(err) {}
		}
	}
})
//

app.get('/docs', (req, res) => {
	const docPage = req.query['page'];
	fs.readFile(`./docPages/${docPage}.txt`, 'utf8', function(err, data) {
		if(err) {
			res.status(404).send(err)
			return;
		}

		res.json(data.replaceAll('\n', '<br>'))
	})
})

app.post('/auth', (req, res) => {
	if(!req.body['auth']) {
		res.status(404).send('Param "auth" is needed.')
		return;
	}

	axios({
		method: 'GET',
		url: 'https://photop.exotek.co/me',
		headers: {
			"auth": req.body['auth']
		}
	}).then(response => {
		let data = response.data.user;
		webtoken.sign({ userid: data._id }, process.env['authtokenkey'], {}, async function(err, token) {
			res.json(token)
		});
	}).catch(err => {
		res.status(404).send(err.message)
	})
})

app.ws('/', async function(ws, req) {
	const id = uuidv4();
  websockets[id] = ws;
	ws.send(JSON.stringify({
		type: 'sessionId',
		id: id
	}))

	ws.on('message', (msg) => {
		msg = JSON.parse(msg)
		switch(msg.type) {
			case 'userSession':
				if(userIdSession[id]) return;
				userIdSession[id] = msg.userid;

				let userData = db.storage[msg.userid];
				userWebsockets[id] = userData;
				break;
		}
	})

  ws.on('close', function() {
    delete websockets[id];
		delete userIdSession[id];
		delete userWebsockets[id];
  });
})
app.ws('/censorshipPlugin', (ws, req) => {
	pluginWebsockets.censorship.push(ws)

	ws.on('close', function() {
    pluginWebsockets.censorship.splice(pluginWebsockets.censorship.indexOf(ws), 1)
  });
})