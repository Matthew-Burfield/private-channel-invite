module.exports = (function () {
  const MongoClient = require('mongodb').MongoClient

  const publicMethods = {

    findUserToken(user_id) {
      return new Promise((resolve, reject) => {
        MongoClient.connect(process.env.DB_CONNECTION, (err, db) => {
          const tokenCollection = db.collection('tokens')
          const doc = tokenCollection.findOne(
            { user_id }
          ).then(res => resolve(res.token))
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