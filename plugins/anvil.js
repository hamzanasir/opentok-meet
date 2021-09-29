const request = require('request');
const jwt = require('jwt-simple');

function Anvil(config) {
  const url = config.apiUrl;

  const createJwtToken = (props) => {
    props = props || {};

    const claims = {
      iat: props.issuedAt || Math.floor((Date.now() / 1000)),
      exp: props.expire || Math.floor((Date.now() / 1000) + 300),
      iss: props.issuer,
      ist: props.issuerType,
      scope: props.scope,
      nonce: Math.random(),
    };

    const token = jwt.encode(claims, props.secret);
    return token;
  };

  const generateJwtHeader = (props) => {
    const token = createJwtToken(props);

    return { 'X-OPENTOK-AUTH': token };
  };

  this.getSubscriberInfo = function getSubscriberInfo(payload, done) {
    payload = payload || {};

    if (!payload.apiSecret) {
      done(new Error('apiSecret required'));
      return;
    }

    const endpoint = `${url}/v2/project/${payload.apiKey}/session/${payload.sessionId}/subscriber/all/${payload.subscriberId}`;

    const props = {
      issuer: payload.apiKey,
      secret: payload.apiSecret,
      issuerType: 'project',
      scope: 'session.read',
    };

    const header = generateJwtHeader(props);

    request({
      method: 'GET',
      uri: endpoint,
      headers: header,
      json: true,
    }, (err, res) => {
      if (err) {
        done(err);
        return;
      } else if (res.statusCode !== 200) {
        console.log('error response ', res.statusCode, res.body);
        done(new Error(`invalid response from anvil ${res.statusCode}`));
        return;
      }

      done(null, res.body);
    });
  };

  this.startWebViewComposer = function startWebViewComposer(body, done) {
    const uri = `${url}/v2/project/${config.apiKey}/render`;

    const props = {
      issuer: config.apiKey,
      secret: config.apiSecret,
      issuerType: 'project',
    };

    const headers = generateJwtHeader(props);

    request({
      method: 'POST',
      uri,
      headers,
      json: true,
      body,
    }, (error, response) => {
      if (response && response.statusCode === 202 && response.body.id) {
        const renderId = response.body.id;
        console.log(`Render created with id: ${renderId}`);
        done(null, response.body.id);
      } else {
        console.log(`Failed to create the render: ${error}`);
        done(error);
      }
    });
  };

  this.stopWebViewComposer = function stopWebViewComposer(renderId, done) {
    const uri = `${url}/v2/project/${config.apiKey}/render/${renderId}`;

    const props = {
      issuer: config.apiKey,
      secret: config.apiSecret,
      issuerType: 'project',
    };

    const headers = generateJwtHeader(props);

    request({
      method: 'DELETE',
      uri,
      headers,
      json: true,
    }, (error, response) => {
      if (response && response.statusCode === 200) {
        done();
      } else {
        console.log(`Failed to stop the render: ${error}`);
        done(error);
      }
    });
  };
}

module.exports = Anvil;
