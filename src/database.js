module.exports = (function () {
  const MongoClient = require('mongodb').MongoClient
  const APP_NAME = require('./constants').APP_NAME

  const publicMethods = {

    findUserToken(user_id) {
      return new Promise((resolve, reject) => {
        MongoClient.connect(process.env.DB_CONNECTION, (err, db) => {
          const tokenCollection = db.collection('tokens')
          const doc = tokenCollection.findOne(
            { user_id }
          ).then((res) => {
            if (res === null) {
              reject(`You haven't authorized ${APP_NAME} access to your private channels. Please go to https://matthew-burfield.github.io/private-channel-invite/ to authorize.`)
            } else {
              resolve(res.token)
            }
          })
          db.close()
        })
      })
    },


    updateUserToken(user_id, token) {
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
    }


  }

  return publicMethods
})()