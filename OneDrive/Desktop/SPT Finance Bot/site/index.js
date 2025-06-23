// Most functions from https://photop.live/

let months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];
let week = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];
let wireframes = {};
let pages = {};
let account = {};
let userID = null;
let body = document.body;
let app = findI('App');
let pageHolder = findI('PageHolder');
let isMobile = false;
let tempListeners = [];
function tempListen(parent, listen, runFunc, extra) {
  parent.addEventListener(listen, runFunc, extra);
  tempListeners.push({
    parent: parent,
    name: listen,
    listener: runFunc
  });
}
function removeTempListeners() {
  for (let i = 0; i < tempListeners.length; i++) {
    let remEvent = tempListeners[i];
    if (remEvent.parent != null) {
      remEvent.parent.removeEventListener(remEvent.name, remEvent.listener);
    }
  }
}
function copyClipboardText(text) {
  navigator.clipboard.writeText(text).then(
    function () {
      //console.log('Async: Copying to clipboard was successful!');
    },
    function (err) {
      console.error('Async: Could not copy text: ', err);
    }
  );
}
function clipBoardRead(e) {
  e.preventDefault();
  document.execCommand('inserttext', false, e.clipboardData.getData('text/plain'));
}
function findC(name) {
  return document.getElementsByClassName(name) [0];
}
function findI(name) {
  return document.getElementById(name);
}
let currentPage = '';
let currentPageWithSearch = window.location.search;
let currentlyLoadingPages = {};
async function setPage(name) {
  let loadedPage = currentPage;
  currentPage = name;
  if (loadedPage != name) {
    pageHolder.innerHTML = '';
  }
  removeTempListeners();
  if (wireframes[name] == null) {
    if (currentlyLoadingPages[name] != null) {
      return;
    }
    currentlyLoadingPages[name] = '';
    await loadScript('./pages/' + name + '.js');
    delete currentlyLoadingPages[name];
  }
  if (name != 'home' || loadedPage != name) {
    pageHolder.innerHTML = wireframes[name];
  }
  if (pages[name] != null) {
    window.location.hash = '#' + name;
    await pages[name]();
    let title = name;
    title = name.charAt(0).toUpperCase() + name.slice(1);
    document.title = 'Finances | ' + title;
  }
}
async function refreshPage() {
  pageHolder.innerHTML = wireframes[currentPage] ||
  '';
  removeTempListeners();
  if (wireframes[currentPage] == null) {
    if (currentlyLoadingPages[currentPage] != null) {
      return;
    }
    currentlyLoadingPages[currentPage] = '';
    await loadScript('./pages/' + currentPage + '.js');
    delete currentlyLoadingPages[currentPage];
  }
  if (pages[currentPage] != null) {
    window.location.hash = '#' + currentPage;
    await pages[currentPage]();
    let title = currentPage;
    title = currentPage.charAt(0).toUpperCase() + currentPage.slice(1);
    document.title = 'Finances | ' + title;
  }
}
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function getScript(url) {
  return document.querySelector('[src=\'' + url + '\'');
}
async function loadScript(url) {
  return new Promise(
    function (resolve) {
      let loaded = getScript(url);
      if (loaded) {
        if (loaded.hasAttribute('done')) {
          resolve(loaded);
        } else {
          loaded.addEventListener('load', function () {
            resolve(loaded);
          });
        }
        return;
      }
      let newScript = document.createElement('script');
      newScript.addEventListener(
        'load',
        function () {
          newScript.setAttribute('done', '');
          resolve(newScript);
        }
      );
      newScript.src = url;
      document.body.appendChild(newScript);
    }
  );
}
function getParam(key) {
  let queryString = window.location.search;
  let urlParams = new URLSearchParams(queryString);
  return urlParams.get(key);
}
function modifyParams(key, value) {
  const Url = new URL(window.location);
  if (value != null) {
    Url.searchParams.set(key, value);
  } else {
    Url.searchParams.delete(key);
  }
  window.history.pushState({
  }, '', Url);
}
let epochOffset = 0;
function getEpoch() {
  return Date.now() + epochOffset;
}
let sentFirstReq = false;
async function sendRequest(method, path, body, noFileType) {
  if (account.banned == true && path != 'mod/appeal') {
    return [0,
    'Account Banned'];
  }
  let hadSentFirst = sentFirstReq;
  sentFirstReq = true;
  try {
    let sendData = {
      method: method,
      headers: {
        'cache': 'no-cache'
      }
    };
    if (noFileType != true) {
      sendData.headers['Content-Type'] = 'text/plain';
    }
    if (body != null) {
      if (typeof body == 'object' && body instanceof FormData == false) {
        body = JSON.stringify(body);
      }
      sendData.body = body;
    }
    let token = getLocalStore('token');
    if (token != null) {
      token = JSON.parse(token);
      if (token.expires < Math.floor(getEpoch() / 1000)) {
        token = await renewToken() ||
        token;
      }
      let sendUserID = userID ||
      getLocalStore('userID');
      if (sendUserID != null) {
        sendData.headers.auth = sendUserID + ';' + token.session;
      }
    }
    let response = await fetch(config.server + path, sendData);
    if (response.headers.has('date') == true) {
      let serverTimeMillisGMT = new Date(response.headers.get('date')).getTime();
      let localMillisUTC = new Date().getTime();
      epochOffset = serverTimeMillisGMT - localMillisUTC;
    }
    switch (response.status) {
      case 401:
        await renewToken();
        break;
      case 429:
        (await getModule('modal')) (
          'Rate Limited',
          await response.text(),
          [
            ['Okay',
            'var(--grayColor)']
          ]
        );
        break;
      case 418:
        account.banned = true;
        let data = JSON.parse(await response.text());
        (await getModule('modal')) (
          'Account Banned',
          `Oh no! It appears you have broken a Photop rule resulting in your account being banned.<br><br><b>Account:</b> ${ data.account }<br><b>Reason:</b> ${ data.reason }<br><b>Expires:</b> ${ (
            data.expires == 'Permanent' ? 'Permanent' : formatFullDate(data.expires * 1000)
          ) }${ (data.terminated == true ? '<br><b>Terminated:</b> Yes' : '') }${ !data.appealed ? `<br><div id="banAppealInput" contenteditable class="textArea" placeholder="Appeal your Ban"></div><button id="submitAppealButton">Submit</button>` : '' }`
        );
        let appealSend = findI('submitAppealButton');
        if (appealSend != null) {
          appealSend.addEventListener(
            'click',
            async function () {
              let appealInput = findI('banAppealInput');
              if (appealInput.textContent.length < 1) {
                (await getModule('modal')) (
                  'Write an Appeal',
                  'You must write an appeal before submitting it.',
                  [
                    ['Okay',
                    'var(--grayColor)']
                  ]
                );
                return;
              }
              let[code] = await sendRequest(
                'POST',
                'mod/appeal',
                {
                  appeal: appealInput.textContent.substring(0, 250)
                }
              );
              if (code == 200) {
                appealInput.remove();
                appealSend.remove();
                (await getModule('modal')) (
                  'Appeal Sent',
                  'We\'ve recieved your appeal and will review it as soon as possible.',
                  [
                    ['Okay',
                    'var(--grayColor)']
                  ]
                );
              }
            }
          );
        }
        break;
      default:
        return [response.status,
        await response.text()];
    }
    return [0,
    'Request Refused'];
  } catch (err) {
    if (hadSentFirst == false) {
      findI(
        'backBlur' + (await getModule('modal')) (
          'Error Reaching Server',
          'Oh no! We encountered an error sending your request through the pipes of the internet. Please try again later.',
          [
            ['Retry',
            'var(--themeColor)',
            function () {
              location.reload();
            }
            ]
          ]
        )
      ).style.zIndex = 999999;
    }
    console.log('FETCH ERROR: ' + err);
    return [0,
    'Fetch Error'];
  }
}
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
function handleIntersection(entries, observer) {
  entries.forEach(
    entry => {
      if (entry.isIntersecting) {
        entry.target.style.visibility = 'visible';
      } else {
        entry.target.style.visibility = 'hidden';
      }
    }
  );
}
function randomString(l) {
  var s = '';
  var randomchar = function () {
    var n = Math.floor(Math.random() * 62);
    if (n < 10) return n; //1-10
    if (n < 36) return String.fromCharCode(n + 55); //A-Z
    return String.fromCharCode(n + 61); //a-z
  };
  while (s.length < l) s += randomchar();
  return s;
}
function timeSince(time, long) {
  let calcTimestamp = Math.floor((Date.now() - time) / 1000);
  if (calcTimestamp < 1) {
    calcTimestamp = 1;
  }
  let amountDivide = 1;
  let end = (long ? 'Second' : 's');
  if (calcTimestamp > 31536000 - 1) {
    amountDivide = 31536000;
    end = (long ? 'Year' : 'y');
  } else if (calcTimestamp > 2592000 - 1) {
    amountDivide = 2592000;
    end = (long ? 'Month' : 'mo');
  } else if (calcTimestamp > 604800 - 1) {
    amountDivide = 604800;
    end = (long ? 'Week' : 'w');
  } else if (calcTimestamp > 86400 - 1) {
    amountDivide = 86400;
    end = (long ? 'Day' : 'd');
  } else if (calcTimestamp > 3600 - 1) {
    amountDivide = 3600;
    end = (long ? 'Hour' : 'h');
  } else if (calcTimestamp > 60 - 1) {
    amountDivide = 60;
    end = (long ? 'Minute' : 'm');
  }
  let timeToSet = Math.floor(calcTimestamp / amountDivide);
  if (timeToSet > 1 && long) {
    end += 's';
  }
  if (long == true) {
    return timeToSet + ' ' + end + ' Ago';
  } else {
    return timeToSet + end;
  }
}
function cleanString(str) {
  return str.replace(/\>/g, '&#62;').replace(/\</g, '&#60;');
}
function abbr(num) {
  let x;
  if (num >= 100000000000) {
    return Math.floor(num / 1000000000) + 'B';
  } else if (num >= 10000000000) {
    x = Math.floor((num / 1000000000) * 10) / 10;
    return x.toPrecision(3) + 'B';
  } else if (num >= 1000000000) {
    x = Math.floor((num / 1000000000) * 100) / 100;
    return x.toPrecision(3) + 'B';
  } else if (num >= 100000000) {
    return Math.floor(num / 1000000) + 'M';
  } else if (num >= 10000000) {
    x = Math.floor((num / 1000000) * 10) / 10;
    return x.toPrecision(3) + 'M';
  } else if (num >= 1000000) {
    x = Math.floor((num / 1000000) * 100) / 100;
    return x.toPrecision(3) + 'M';
  } else if (num >= 100000) {
    return Math.floor(num / 1000) + 'K';
  } else if (num >= 10000) {
    x = Math.floor((num / 1000) * 10) / 10;
    return x.toPrecision(3) + 'K';
  } else if (num >= 1000) {
    x = Math.floor((num / 1000) * 100) / 100;
    return x.toPrecision(3) + 'K';
  } else {
    return num;
  }
}
function formatDate(time) {
  let d = new Date(time + epochOffset);
  return `${ months[d.getMonth()] } ${ d.getDate() }, ${ d.getFullYear() }`;
}
function formatAMPM(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes.toString().padStart(2, '0');
  let strTime = hours + ':' + minutes + ' ' + ampm;
  return strTime;
}
function formatFullDate(time) {
  let date = new Date(time + epochOffset);
  let splitDate = date.toLocaleDateString().split('/');
  return week[date.getDay()] + ', ' + months[splitDate[0] - 1] + ' ' + splitDate[1] + ', ' + splitDate[2] + ' at ' + formatAMPM(date);
}

window.addEventListener(
  'hashchange',
  function () {
    let pageName = window.location.hash.substring(1);
    if (currentPage == pageName.replace(/\./g, '')) {
      return;
    }
    if (pageName[pageName.length - 1] == '.') {
      history.back();
      return;
    }
    setPage(pageName);
  }
);
if (window.location.hash != '') {
  setPage(window.location.hash.substring(1));
} else {
  setPage('home');
}