const OpenTok = require('opentok');

module.exports = (redis, ot) => {
  const roomStore = {
    isP2P(room) {
      return room.toLowerCase().indexOf('p2p') >= 0;
    },
    getRooms(callback) {
      redis.hkeys('rooms', callback);
    },
    clearRooms(callback) {
      // This deletes all of the rooms. Only use this when migrating to
      // a different environment
      redis.del('rooms', callback);
    },
    updateRoomTimestamp(room, sessionId) {
      redis.hset('rooms', room, `${sessionId}:${Date.now()}`);
    },
    getRoom(room, apiKey, secret, req) {
      console.log(`getRoom: ${room} ${apiKey} ${secret}`);
      const goToRoom = arguments[arguments.length - 1]; // eslint-disable-line
      // Lookup the mapping of rooms to sessionIds
      redis.hget('rooms', room, (err, sid) => {
        if (!sid) {
          req.session.redirectUrl = req.originalUrl;
          if (!req.user) {
            return goToRoom({ message: 'AUTH-REQUIRED' });
          }
          const props = {
            mediaMode: 'routed',
          };
          if (roomStore.isP2P(room)) {
            props.mediaMode = 'relayed';
          }
          let otSDK = ot;
          // If there's a custom apiKey and secret use that
          if (apiKey && secret) {
            otSDK = new OpenTok(apiKey, secret);
          }
          // Create the session
          otSDK.createSession(props, (createErr, session) => {
            if (createErr) {
              goToRoom(createErr);
            } else {
              const { sessionId } = session;
              // Store the room to sessionId mapping
              redis.hset('rooms', room, `${sessionId}:${Date.now()}`, (setErr) => {
                if (setErr) {
                  console.error('Failed to set room', setErr);
                  goToRoom(setErr);
                } else if (apiKey && secret) {
                  // If there's a custom apiKey and secret store that
                  redis.hset(
                    'apiKeys', room, JSON.stringify({
                      apiKey,
                      secret,
                    }),
                    (apiKeyErr) => {
                      if (apiKeyErr) {
                        console.error('Failed to set apiKey', apiKeyErr);
                        goToRoom(apiKeyErr);
                      } else {
                        goToRoom(null, sessionId, apiKey, secret);
                      }
                    }
                  );
                } else {
                  goToRoom(null, sessionId);
                }
              });
            }
          });
        } else {
          const sidSplit = sid.split(':');
          const ts = parseInt(sidSplit[1] || Date.now(), 10);
          const sessionId = sidSplit[0];
          if ((Date.now() - ts) > 1800000) {
            redis.hdel('rooms', room);
            goToRoom({ message: 'SESSION-EXPIRED' });
          } else {
            this.updateRoomTimestamp(room, sessionId);
            // Lookup if there's a custom apiKey for this room
            redis.hget('apiKeys', room, (getErr, apiKeySecret) => {
              if (getErr || !apiKeySecret) {
                goToRoom(null, sessionId);
              } else {
                const parsedApiKeySecret = JSON.parse(apiKeySecret);
                goToRoom(null, sessionId, parsedApiKeySecret.apiKey, parsedApiKeySecret.secret);
              }
            });
          }
        }
      });
    },
  };
  return roomStore;
};
