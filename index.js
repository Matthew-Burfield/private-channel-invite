'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(process.env.PORT || 8080, () => {
    console.log('Express server listening on port %d in $s mode', server.address().port, app.settings.env);
});

/*
/gif (completely random gif)
/gif [category] (random gif but related to category)
/gif -s [search] (specific gif that matches the search)
/gif -t [1-25] (trending gif, optional specify nr)
*/

app.post('/slack', (req, res) => {

  const channel = req.body.text
  
  const BASE_URL = 'https://slack.com/api/'
  const GET_GROUPS = 'groups.list'
  const GET_GROUP_INFO = 'groups.info'
  const credentials = {
    form: {
      token: process.env.VERIFICATION_TOKEN
    }
  }
  
  request.post(`${BASE_URL}${GET_GROUPS}`, credentials, (err, response, body) => {
    const groupList = JSON.parse(body)
    const group = groupList.groups.find(group => group.name === channel)
    if (!group) {
      res.send('No channel by this name found')
    } else {
      res.send(group.id)
    }
  });

  

  //console.log(finalUrl);

  // request({
  //   url: finalUrl,
  //   json: true
  // }, function (error, response, body) {

  //   if (!error && response.statusCode === 200) {
  //   //response ok
  //     // console.log(`type: ${type}; image: ${getImageUrl(body, type)}`);
  //     //console.log(getResponseType(type), type);

  //     const data = getData(body, type);
      
  //     res.json(data); // Print the json response
      
  //   }
    
  // });

});

app.get('/slack/oauth', (req, res) => {
  if (!req.query.code) { // access denied
    console.log('access denied');
    res.send('sup yo');
  }
  const data = {
    form: {
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code: req.query.code,
    },
  };

  //console.log(process.env.SLACK_CLIENT_ID);


  request.post('https://slack.com/api/oauth.access', data, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      // You are done.
      // If you want to get team info, you need to get the token here
      let token = JSON.parse(body).access_token; // Auth token
      //console.log(token);

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
