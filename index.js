'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const MongoClient = require('mongodb').MongoClient
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(process.env.PORT || 8080, () => {
    console.log('Express server listening on port %d in $s mode', server.address().port, app.settings.env);
});

const BASE_URL = 'https://slack.com/api/'
const GET_GROUPS = 'groups.list'
const GET_GROUP_INFO = 'groups.info'
const GROUP_INVITE = 'groups.invite'
const APP_NAME = 'Private Channel Inviter'
const credentials = {
  form: {
    token: ''
  }
}

const sendUserInfo = (responseURL, text) => {
  const data = {
    response_type: 'ephemeral',
    text
  }
  request.post(responseURL, { body: JSON.stringify(data) });
}

const requestTokenFromDB = (user_id, callback) => {
  return new Promise((resolve, reject) => {
    MongoClient.connect(process.env.DB_CONNECTION, (err, db) => {
      const tokenCollection = db.collection('tokens')
      const doc = tokenCollection.findOne(
        { user_id: user_id }
      ).then(res => resolve(res.token))
      db.close()
    })
  });
}

app.post('/slack/action-endpoint', (req, res) => {
  const payload = JSON.parse(req.body.payload)
  const responseURL = payload.response_url
  const payloadValues = payload.actions[0].value.split('|')
  const userToInviteID = payload.user.id
  const privateChannelID = payloadValues[0]
  const privateChannelOwnerID = payloadValues[1]

  requestTokenFromDB(privateChannelOwnerID)
  .then(token => {
    const credentials = {
      form: {
        token,
        channel: privateChannelID,
        user: userToInviteID
      }
    }
    request.post(`${BASE_URL}${GROUP_INVITE}`, credentials, (err, response, body) => {
      if (JSON.parse(body).ok) {
        sendUserInfo(responseURL, 'Hoorah! You\'ve been added to the channel. Have fun!')
      } else {
        sendUserInfo(responseURL, 'Oops, for some reason you weren\'t able to be added to the channel. Please try again')
      }
    })
    res.json(payload.original_message)
  })
});

app.post('/slack', (req, res) => {

  const channel = req.body.text
  const user_name = req.body.user_name
  const user_id = req.body.user_id
  const responseURL = req.body.response_url

  requestTokenFromDB(user_id)
  .then(token => {
    request.post(`${BASE_URL}${GET_GROUPS}`, { form: { token: token } }, (err, response, body) => {
      const groupList = JSON.parse(body)
      if (groupList.ok) {
        const group = groupList.groups.find(group => group.name === channel)
        if (!group) {
          sendUserInfo(responseURL, 'No channel by this name found. Only the channel owner/creator can invite members to join')
        } else {
          if (group.creator === user_id) {
            const data = {
              response_type: 'in_channel',
              text: `@${user_name} has invited everyone to join the private channel #${group.name}`,
              attachments: [
                {
                  text: 'Click below to join',
                  fallback: 'You are unable to join',
                  callback_id: 'join_channel',
                  color: '#3AA3E3',
                  attachment_type: 'default',
                  actions: [
                    {
                      name: 'Join',
                      text: 'Join',
                      type: 'button',
                      style: 'primary',
                      value: `${group.id}|${user_id}`
                    }
                  ]
                }
              ]
            }
            request.post(responseURL, { body: JSON.stringify(data) });
          } else {
            sendUserInfo(responseURL, 'Only the group creator and do a bulk invite')
          }
        }
      } else {
        sendUserInfo(responseURL, `You haven't authorized ${APP_NAME} access to your private channels.`)
      }
    });
  });
  res.status(200).send('Processing...')
});

app.get('/slack/oauth', (req, res) => {
  if (!req.query.code) { // access denied
    res.send('access denied');
    return
  }

  const data = {
    form: {
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code: req.query.code,
    },
  };

  request.post('https://slack.com/api/oauth.access', data, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      // You are done.
      // If you want to get team info, you need to get the token here
      const bodyObj = JSON.parse(body)
      const token = bodyObj.access_token; // Auth token
      const user_id = bodyObj.user_id

      MongoClient.connect(process.env.DB_CONNECTION, (err, db) => {
        const tokenCollection = db.collection('tokens')
        tokenCollection.update(
          { user_id: user_id },
          {
            user_id,
            token
          },
          { upsert: true }
        )
        db.close()
      })

      request.post('https://slack.com/api/team.info', {form: {token: token}}, (error, response, body) => {
        if (!error && response.statusCode == 200) {
          if(JSON.parse(body).error == 'missing_scope') {
            res.send('Gif has been added to your team!');
          } else {
            let team = JSON.parse(body).team.domain;
            res.redirect(`http://${team}.slack.com/apps/manage`);
          }
        }
      });
    }
  });
});
