const OTKAnalytics = require('opentok-solutions-logging');

let otkAnalytics;

const init = (session, action) => {
  const otkanalyticsData = {
    clientVersion: OT.version,
    source: window.location.href,
    action,
    name: 'meet.tokbox.com',
    componentId: 'meet.tokbox.com',
    userAgent: navigator.userAgent,
  };

  otkAnalytics = new OTKAnalytics(otkanalyticsData, { loggingUrl: 'hlg.dev.tokbox.com/qa/logging/ClientEvent' });

  const sessionInfo = {
    sessionId: session.sessionId,
    connectionId: session.connection.connectionId,
    partnerId: session.apiKey,
  };

  otkAnalytics.addSessionInfo(sessionInfo);
};

const log = (data) => {
  otkAnalytics.logEvent(data);
};

const isInitiated = () => otkAnalytics;

const destroy = () => {
  otkAnalytics = null;
};

module.exports = {
  init,
  log,
  isInitiated,
  destroy,
};
