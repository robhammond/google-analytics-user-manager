var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

const SCOPES = ['https://www.googleapis.com/auth/analytics.manage.users.readonly',
  'https://www.googleapis.com/auth/analytics.manage.users',
  'https://www.googleapis.com/auth/analytics.readonly'];
const TOKEN_DIR = './';
const TOKEN_PATH = TOKEN_DIR + 'token.json';
const ACCOUNT = require('./config');
const ACCOUNT_ID = ACCOUNT.accountId;

const USER_EMAIL = ''; // what user to add
const PERMISSIONS = ['READ_AND_ANALYZE']; // what permissions to give

const PROPERTY_VIEW_IDS = [
  {
    property : 'UA-xxxx-1',
    view : 12345
  }
];

// Load client secrets from a local file.
fs.readFile('./client_secrets.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Drive API.
  authorize(JSON.parse(content), addUser);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', "\n", authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * insert user
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

function addUser(auth) {
  for (let i=0;i<PROPERTY_VIEW_IDS.length;i++) {
    insertWebProfileUser(auth,PROPERTY_VIEW_IDS[i]);
  }
}

function insertWebProfileUser(auth, ids) {
  var request_body = {
    "userRef" : {
      "email" : USER_EMAIL
    },
    "permissions" : {
      "effective" : PERMISSIONS
    }
  };
  var service = google.analytics('v3');
  service.management.profileUserLinks.insert({
    auth: auth,
    accountId : ACCOUNT_ID,
    webPropertyId : ids.property,
    profileId : ids.view,
    // fields : "entity,permissions"
  }, request_body);
  // , function(err, response) {
  //   if (err) {
  //     console.log("Error inserting users: " + err);
  //     return;
  //   }

  //   console.log(response);

  // });
}