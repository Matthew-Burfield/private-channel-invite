module.exports = (function () {
  const database = require('./database')
  const request = require('request')

  const publicMethods = {
    prepareForUserResponse(responseURL) {
      return function(text) {
        const data = {
          response_type: 'ephemeral',
          text
        }
        request.post(responseURL, { body: JSON.stringify(data) });
      }
    },

    requestTokenFromDB(user_id) {
      return database.findUserToken(user_id)
    },

    updateUserToken(user_id, token) {
      return database.updateUserToken(user_id, token)
    },

    handleInviteErrors(error) {
      switch (error) {
        case 'cant_invite_self':
          return 'You can\'t invite yourself dummy!'
        case 'is_archived':
          return 'This channel has been archived. You can no longer join it'
        case 'invalid_auth':
        case 'account_inactive':
          return `The authentication token is no longer valid. The channel creator will need to re-authenticate with ${constants.APP_NAME}`
        default:
          return 'Oops, for some reason you weren\'t able to be added to the channel. Please try again'
      }
    }
  }

  return publicMethods

})()