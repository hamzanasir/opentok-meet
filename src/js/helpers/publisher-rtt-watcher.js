const analytics = require('./analytics');

const RTT_THRESHOLD = 10000;
const INTERVAL_DELAY = 30 * 1000;

let interval;
let previousRttValues = {};

const stop = () => {
  if (interval) {
    clearInterval(interval);
    interval = null;
    analytics.destroy();
    previousRttValues = {};
  }
};

const start = (publisher, session) => {
  stop();

  interval = setInterval(() => {
    // init analytics
    if (session.connection.connectionId && !analytics.isInitiated()) {
      analytics.init(session);
    }

    publisher.getRtcStatsReport().then((stats) => {
      const reports = stats[0].rtcStatsReport;
      reports.forEach((report) => {
        if (report.type === 'remote-inbound-rtp') {
          const { roundTripTime, kind } = report;
          if (roundTripTime >= RTT_THRESHOLD) {
            const data = { rtt: roundTripTime, kind };
            if (kind.toString() in previousRttValues) {
              data.previousRtt = previousRttValues[kind];
            }
            analytics.log(data);
          } else {
            previousRttValues[kind] = report.roundTripTime;
          }
        }
      });
    });
  }, INTERVAL_DELAY);
};

module.exports = {
  start,
  stop,
};
