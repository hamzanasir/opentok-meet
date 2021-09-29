const Anvil = require('../anvil');
const roomstore = require('../../server/roomstore.js');

module.exports = (app, config, redis, ot) => {
  const anvil = new Anvil(config);
  const RoomStore = roomstore(redis, ot);

  app.post('/:room/start-web-view-composing', (req, res) => {
    const body = {
      'url': req.body.url,
      'sessionId': req.body.sessionId,
      'token': req.body.token,
      'statusCallbackUrl': req.body.statusCallbackUrl,
    };

    anvil.startWebViewComposer(body, (error, renderId) => {
      if (error) {
        console.error('Error starting the render: ', error);
        res.status(400).send();
        return;
      }
      res.status(200).send({ id: renderId });
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

  app.post('/:room/status-callback', (req, res) => {
    const { id, streamId, status } = req.body;
    const room = req.param('room');

    RoomStore.getRoom(room, (err, sessionId) => {
      if (err) {
        console.error('Error getting room: ', err);
        return;
      }

      ot.signal(sessionId, null, {
        type: 'wvc',
        data: {
          status,
          id,
          streamId,
        },
      }, (error) => {
        if (error) {
          console.log('error sending wvc signal: ', error);
        }
      });
    });
    // Sending 200 as ack back to the API server
    res.status(200).send();
  });
};
