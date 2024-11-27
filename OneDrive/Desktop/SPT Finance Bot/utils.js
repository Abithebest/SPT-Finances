const fs = require('fs')
const axios = require('axios')

const MongoModule = require("mongodb"); // Companies: companyid, serverid, finances
const MongoClient = MongoModule.MongoClient;
const client = new MongoClient(process.env['mongoToken']);

let currency = 'T¢';
let verifiedUsers = ['748910218846666894', '486806760288550933']
let Months = [
  "🥳 January",
  "🫶 Febuary",
  "🍀 March",
  "🐇 April",
  "🤱 May",
  "👨‍🍼 June",
  "🎆 July",
  "🎒 August",
  "👷‍♂️ September",
  "🎃 October",
  "🦃 November",
  "🎅 December"
]

function getObject(arr, field) {
  if (arr == null) {
    return {
    };
  }
  let returnObj = {};
  for (let i = 0; i < arr.length; i++) {
    let setObject = arr[i];
    returnObj[setObject[field]] = setObject;
  }
  return returnObj;
}

function getRole(role) {
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1FA99}]/gu;
    
  const emojis = role.name.match(emojiRegex)?.join('') || '';
  const name = role.name.replace(emojiRegex, '').trim();
  
  return {
    name: name,
    emojis: emojis
  };
}

function formatNum(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function uppercase(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function isDateInRange(date, date1, date2) {
  const d = new Date(date).getTime();
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  
  const minDate = Math.min(d1, d2);
  const maxDate = Math.max(d1, d2);
  
  return d >= minDate && d <= maxDate;
}

function splitArray(originalArray, splitSize = 10) {
  const splitArrays = [];

  for (let i = 0; i < originalArray.length; i += splitSize) {
    splitArrays.push(originalArray.slice(i, i + splitSize));
  }

  return splitArrays;
}

let compare = (num1, num2) => {
	if(num1 < num2) {
		return '<:SPTStonksUP:1297626694785568768>';
	} else {
		return '<:SPTUnstonksDown:1297627048919044116>';
	}
}

async function request(url, method, body) {
  var myHeaders = new Headers();
  myHeaders.append('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0')
  myHeaders.append('X-ACCESS-TOKEN', process.env['companyToken'])

  let req = await fetch(`https://e.truckyapp.com/api/v1/${url}`, {
    method,
    headers: myHeaders
  })

  return [ req.status, await req.text() ];
}

let commands = []
module.exports = {
	commands,
	db: client.db('Finances'),
	verifiedUsers,
	Months,
	getObject,
	splitArray,
	isDateInRange,
	uppercase,
	formatNum,
	getRole,
	compare,
  request,
  currency
}

async function defineCommand(c) {
	let command = c.command;
	if (command.testing && process.env['testing'] != 'true') return;
	
  commands.push(command)
}
fs.readdirSync('./commands').forEach((item) => {
	defineCommand(require(`./commands/${item}`))
})