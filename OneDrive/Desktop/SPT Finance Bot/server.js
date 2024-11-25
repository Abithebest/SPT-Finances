const express = require('express')
const fs = require('fs')
const path = require('path');
const app = express()

const webtoken = require('jsonwebtoken')
const encrypt = (text) => {
  return CryptoJS.AES.encrypt(text, process.env['pass']).toString()
};

const decrypt = (data) => {
	var decrypted = CryptoJS.AES.decrypt(data, process.env['pass'])
  return decrypted.toString(CryptoJS.enc.Utf8)
};

const utils = require('./utils.js')

app.use(express.static('site'))
app.use(express.json())

const endpointsFolderPath = './endpoints';
const registerRoutesFromFolders = (folderPath, basePath = '') => {
  fs.readdirSync(folderPath).forEach((item) => {
    const itemPath = path.join(folderPath, item);
    const itemStats = fs.statSync(itemPath);

    if (itemStats.isDirectory()) {
      const nestedBasePath = `${basePath}/${item}`;
      const indexPath = path.join(itemPath, 'index.js');

      if (fs.existsSync(indexPath)) {
        const router = express.Router();
        const endpoint = require(`./${indexPath}`);
        registerEndpoint(endpoint, router, '/');
        app.use(nestedBasePath, router);
      }

      registerRoutesFromFolders(itemPath, nestedBasePath);
    } else if (item.endsWith('.js') && item !== 'index.js') {
      const endpointPath = `/${item.replace('.js', '')}`;
      const router = express.Router();
      const endpoint = require(`./${itemPath}`);
      registerEndpoint(endpoint, router, endpointPath);
      app.use(`${basePath}`, router);
    } else if (item === 'index.js') {
      const indexPath = path.join(folderPath, 'index.js');
      const router = express.Router();
      const endpoint = require(`./${indexPath}`);
      registerEndpoint(endpoint, router, '/');
      app.use(`${basePath}`, router);
    }
  });
};

const customMiddleware = (keys) => {
  return (req, res, next) => {
    keys.forEach(keyData => {
      if(typeof keyData != 'object') return;
      req[keyData.key] = keyData.data;
    })
    if(keys.includes('authorized')) {
      if(!req.headers['auth']) {
        res.status(404).send('Header "auth" is needed.')
        return;
      }

      webtoken.verify(req.headers['auth'], process.env['authtokenkey'], async function(err, decoded) {
        req.auth = decoded.userid;
      })
    }

    next();
  };
};
const registerEndpoint = (endpoint, router, endpointPath, extra) => {
  const methods = Object.keys(endpoint);
  let keys = [
    {key: 'utils', data: utils}
  ]
  if(endpoint.authed) {
    keys.push('authorized')
  }

  methods.forEach((method) => {
    switch (method) {
      case 'get':
        router.get(endpointPath, customMiddleware(keys), endpoint[method]);
        break;
      case 'post':
        router.post(endpointPath, customMiddleware(keys), endpoint[method]);
        break;
      case 'put':
        router.put(endpointPath, customMiddleware(keys), endpoint[method]);
        break;
      case 'delete':
        router.delete(endpointPath, customMiddleware(keys), endpoint[method]);
        break;
      default:
        break;
    }
  });
};
registerRoutesFromFolders(endpointsFolderPath);

app.listen(3000, () => {
  console.log('Server is ready!')
})