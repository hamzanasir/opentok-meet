const Anvil = require('../anvil');

module.exports = (app, config) => {
  const anvil = new Anvil(config);

  app.post('/:room/start-web-view-composing', (req, res) => {
    const body = {
      'url': req.body.url,
      'sessionId': req.body.sessionId,
      'token': req.body.token,
    };

    anvil.startWebViewComposer(body, (error, riderId) => {
      if (error) {
        console.error('Error starting the render: ', error);
        res.status(400).send();
        return;
      }
      res.status(200).send({ id: riderId });
    });
  });

  app.post('/:room/stop-web-view-composing', (req, res) => {
    const renderId = req.body.id;

    anvil.stopWebViewComposer(renderId, (error) => {
      if (error) {
        console.error('Error stopping the render: ', error);
        res.status(400).send();
        return;
      }
      res.status(200).send();
    });
  });
};
