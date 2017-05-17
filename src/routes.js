module.exports = (function () {

  const request = require('request')
  const constants = require('./constants')
  const helpers = require('./helpers')

  const publicMethods = {

    handleSlack(req, res) {
      const channel = req.body.text
      const user_name = req.body.user_name
      const user_id = req.body.user_id
      const sendUserResponse = helpers.prepareForUserResponse(req.body.response_url)

      helpers.requestTokenFromDB(user_id)
      .then(token => {
        request.post(`${constants.BASE_URL}${constants.GET_GROUPS}`, { form: { token: token } }, (err, response, body) => {
          const groupList = JSON.parse(body)
          if (groupList.ok) {
            const group = groupList.groups.find(group => group.name === channel)
            if (!group) {
              sendUserResponse('No channel by this name found. Only the channel owner/creator can invite members to join')
            } else {
              if (group.creator === user_id) {
                const data = {
                  response_type: 'in_channel',
                  text: `@${user_name} has invited everyone to join the private channel #${group.name}`,
                  attachments: [
                    {
                      text: 'Click below to join and look in the channel section to see your new group!',
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
                request.post(req.body.response_url, { body: JSON.stringify(data) });
              } else {
                sendUserResponse('Only the group creator can do a bulk invite')
              }
            }
          } else {
            sendUserResponse(`You haven't authorized ${constants.APP_NAME} access to your private channels. Please go to https://matthew-burfield.github.io/private-channel-invite/ to authorize.`)
          }
        });
      })
      .catch(reason => sendUserResponse(reason))
      res.status(200).send('Processing...')
    },



    handleActionEndpoint(req, res) {
      const payload = JSON.parse(req.body.payload)
      const sendUserResponse = helpers.prepareForUserResponse(payload.response_url)
      const payloadValues = payload.actions[0].value.split('|')
      const userToInviteID = payload.user.id
      const privateChannelID = payloadValues[0]
      const privateChannelOwnerID = payloadValues[1]

      res.json(payload.original_message)

      helpers.requestTokenFromDB(privateChannelOwnerID)
      .then(token => {
        const credentials = {
          form: {
            token,
            channel: privateChannelID,
            user: userToInviteID
          }
        }
        request.post(`${constants.BASE_URL}${constants.GROUP_INVITE}`, credentials, (err, response, body) => {
          // if (JSON.parse(body).already_in_group) {
          //   sendUserResponse('You\'re already a member of this channel')
          // } else if (JSON.parse(body).ok) {
          //   sendUserResponse('Hoorah! You\'ve been added to the channel. Have fun!')
          // } else {
          //   sendUserResponse(helpers.handleInviteErrors(JSON.parse(body).error))
          // }
        })
      })
    },



    handleAuthentication(req, res) {
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
          const bodyObj = JSON.parse(body)
          const token = bodyObj.access_token; // Auth token
          const user_id = bodyObj.user_id

          helpers.updateUserToken(user_id, token)

          res.redirect('https://matthew-burfield.github.io/private-channel-invite/')
        }
      });
    }

  }

  return publicMethods
})()