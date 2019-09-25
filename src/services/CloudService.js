import { alertActions } from '../actions/alertActions';
import { moduleActions } from '../actions/moduleActions';
import { userActions } from '../actions/userActions';

import { ModuleType } from '../constants/ModuleType';

import { MapService } from './MapService';

var rp = window.require('request-promise');
var errors = window.require('request-promise/errors');

var DomParser = require('dom-parser');
var parser = new DomParser();

var atob = require('atob');
var bplist = require('bplist-parser');

var totalMedia = 0;

var appleSessionID = "";
var appleWidgetKey = "d39ba9916b7251055b22c7f910e2ea796ee65e98b2ddecea8f5dde8d9d1a815d";
var appleSessionToken = "";
var appleTrustToken = "";
var appleSCNT = "";

var appleDSID = "";

var applePushToken = "";

var clientID = "";

var zoneOwnerName = "";

var jar = rp.jar();


export const CloudService = {
  tryAuthenticate: tryAuthenticate,
  authenticateTwoFactor: authenticateTwoFactor
};

function tryAuthenticate(email, password){
  console.log("Trying to authenticate!");
  return dispatch => {
    var options = {
        method: 'POST',
        uri: 'https://idmsa.apple.com/appleauth/auth/signin',
        body: {
          'accountName': email,
          'password': password,
          rememberMe: true,
          trustTokens: []
        },
        headers: getAppleHeaders(),
        jar: jar,
        json: true, // Automatically stringifies the body to JSON
        resolveWithFullResponse: true
    };
    console.log("Options made!");

    rp(options).then(response => {

      appleSessionID = response.headers["x-apple-id-session-id"];
      appleSessionToken = response.headers["x-apple-session-token"];
      appleTrustToken = response.headers["x-apple-twosv-trust-token"];
      appleSCNT =response.headers["scnt"];

      dispatch(moduleActions.changeModule(ModuleType.PROCESS, "Getting account info..."));

      dispatch(getAccountInfo());
    }).catch(err => {
      console.log(err);
      if(err.response.statusCode == 409){
        var body = err.response.body;
        if(typeof body.authType == "string"){

          console.log(err);

          //Set headers
          appleSessionID = err.response.headers["x-apple-id-session-id"];
          appleSessionToken = err.response.headers["x-apple-session-token"];
          appleTrustToken = err.response.headers["x-apple-twosv-trust-token"];
          appleSCNT = err.response.headers["scnt"];

          console.log("Got SCNT: " + appleSCNT);
          console.log("Heeaders: ");
          console.log(err.response.headers);

          console.log("Two factor needed.");
          dispatch(moduleActions.changeModule(ModuleType.TWO_FACTOR));//Prompt two factor
          return;
        }
      }else if(err.response.statusCode == 401){
        dispatch(alertActions.error("Apple ID or password was incorrect."));
        return;
      }else if(err.response.statusCode == 412){//AppleID needs repair
        //call method ot make request to options -> find out reason -> if privacy then agree for htem, else throw error and href.
        dispatch(alertActions.error("There are a few holds on your account, please login and check icloud.com"));
        return;
      }
      console.log(err);
      dispatch(alertActions.error("Unknown error occured! Please report on Github."));
    });
  };
}

function authenticateTwoFactor(code){
  return dispatch => {
    var options = {
        method: 'POST',
        uri: 'https://idmsa.apple.com/appleauth/auth/verify/trusteddevice/securitycode',
        body: {
          'securityCode': {'code': code}
        },
        headers: getAppleHeaders(),
        resolveWithFullResponse: true,
        jar: jar,
        json: true // Automatically stringifies the body to JSON,
    };

    rp(options).then(parsedBody => {
      console.log('Authenticated!');

      dispatch(moduleActions.changeModule(ModuleType.PROCESS, "Attempting to trust client..."));

      dispatch(trustAlways());
    }).catch(err => {
      if(err.response.statusCode == 400){
        dispatch(alertActions.error("Invalid code! Please try again."));
        return;
      }else if(err.response.statusCode == 412){//AppleID needs repair
        //call method ot make request to options -> find out reason -> if privacy then agree for htem, else throw error and href.
        dispatch(alertActions.error("There are a few holds on your account, please login and check icloud.com"));
        return;
      }
      //412
      dispatch(alertActions.error("Could not authenticate! Please report on Github."));
      console.log(err);
    });
  };
}

function trustAlways(){
  return dispatch => {
    var options = {
      method: 'GET',
      uri: 'https://idmsa.apple.com/appleauth/auth/2sv/trust',
      headers: getAppleHeaders(),
      jar: jar,
      resolveWithFullResponse: true
    };
    rp(options).then(parsedBody => {
      console.log('Trusted!');

      appleTrustToken = parsedBody.headers['x-apple-twosv-trust-token'];//Set trust token!
      appleSessionToken = parsedBody.headers["x-apple-session-token"];//New session token

      dispatch(moduleActions.changeModule(ModuleType.PROCESS, "Getting account info..."));
      dispatch(getAccountInfo());
    }).catch(err => {
      console.log(err);
      dispatch(alertActions.error("Could not trust client!"));
    });
  };
}

function getAccountInfo(){
  return dispatch => {
    clientID = newClientID();
    var options = {
      method: 'POST',
      uri: 'https://setup.icloud.com/setup/ws/1/accountLogin?clientBuildNumber=1915Project35&clientId=' + clientID + '&clientMasteringNumber=1915B65',
      body: {
        'accountCountryCode': 'USA',
        'dsWebAuthToken': appleSessionToken
      },
      headers: getAppleHeaders(),
      resolveWithFullResponse: true,
      jar: jar,
      json: true
    };

    rp(options).then(parsedBody => {
      appleDSID = parsedBody.body.dsInfo.dsid;
      var hasDeviceForPhotos = parsedBody.body.hasMinimumDeviceForPhotosWeb;
      if(hasDeviceForPhotos){
        var firstName = parsedBody.body.dsInfo.firstName;
        dispatch(userActions.setName(firstName));
        dispatch(moduleActions.changeModule(ModuleType.PROCESS, "Getting push token..."));
        dispatch(getPushToken());
        return;
      }

      dispatch(alertActions.error("No devices with media found!"));
    }).catch(err => {
      console.log(err);
      dispatch(alertActions.error("Couldn't get account info!"));
    });
  };
}

function getPushToken(){
  return dispatch => {
    var options = {
      method: 'POST',
      uri: 'https://p27-pushws.icloud.com/getToken?attempt=1&clientBuildNumber=1915Project35&clientId=' + clientID + '&clientMasteringNumber=1915B65&dsid=' + appleDSID,
      body: {
        pushTokenTTL: 43200,
        pushTopics: ["73f7bfc9253abaaa423eba9a48e9f187994b7bd9","dce593a0ac013016a778712b850dc2cf21af8266","f68850316c5241d8fd120f3bc6da2ff4a6cca9a8","8a40cb6b1d3fcd0f5c204504eb8fb9aa64b78faf","5a5fc3a1fea1dfe3770aab71bc46d0aa8a4dad41"]
      },
      headers: getAppleHeaders(),
      resolveWithFullResponse: true,
      jar: jar,
      json: true
    }
    rp(options).then(response => {
      applePushToken = response.body.pushToken;
      dispatch(moduleActions.changeModule(ModuleType.PROCESS, "Registering push token..."));
      dispatch(registerPushToken());
    }).catch(err => {
      dispatch(alertActions.error("Couldn't get push token!"));
    });
  };
}

function registerPushToken(){
  return dispatch => {
    var options = {
      method: 'POST',
      uri: 'https://p27-ckdevice.icloud.com/device/1/com.apple.photos.cloud/production/tokens/register?clientBuildNumber=1915Project35&clientId=' + clientID + '&clientMasteringNumber=1915B65&dsid=' + appleDSID,
      body: {
        'apnsToken': applePushToken,
        'apnsEnvironment': 'production',
        'clientID': clientID
      },
      headers: getAppleHeaders(),
      jar: jar,
      resolveWithFullResponse: true,
      json: true
    };
    rp(options).then(response => {
      console.log("Push token registered!");

      dispatch(moduleActions.changeModule(ModuleType.PROCESS, "Getting zone information..."));
      dispatch(getZoneInformation());
    }).catch(err => {
      dispatch(alertActions.error("Couldn't register push token!"));
    });
  }
}

function getZoneInformation(){
  return dispatch => {
      var options = {
      method: 'GET',
      uri: 'https://p27-ckdatabasews.icloud.com/database/1/com.apple.photos.cloud/production/private/zones/list?remapEnums=true&ckjsBuildVersion=1915ProjectDev34&ckjsVersion=2.6.1&getCurrentSyncToken=true&clientBuildNumber=1915Project54&clientMasteringNumber=1915B78&clientId=' + clientID + '&disd=' + appleDSID,
      headers: getAppleHeaders(),
      jar: jar,
      resolveWithFullResponse: true,
      json: true
    };
    rp(options).then(response => {
      zoneOwnerName = response.body.zones[0].zoneID.ownerRecordName;
      console.log("Zone owner is " + zoneOwnerName);
      //All information should be set now basically for any further API requests.
      dispatch(moduleActions.changeModule(ModuleType.PROCESS, "Getting library statistics..."));
      dispatch(getLibraryStats());
    }).catch(err => {
      console.log(err);
      dispatch(alertActions.error("Couldn't get zone information!"));
    });
  };
}

function getLibraryStats(){
  return dispatch => {
    var options = {
      method: 'POST',
      uri: 'https://p27-ckdatabasews.icloud.com/database/1/com.apple.photos.cloud/production/private/records/lookup?remapEnums=true&ckjsBuildVersion=1915ProjectDev34&ckjsVersion=2.6.1&getCurrentSyncToken=true&clientBuildNumber=1915Project54&clientMasteringNumber=1915B78&clientId=' + clientID + '&dsid=' + appleDSID,
      body: {
        records: [{recordName: "PrimarySync-0000-LI"}],
        zoneID: {
          ownerRecordName: zoneOwnerName,
          zoneName: 'PrimarySync',
          zoneType: 'REGULAR_CUSTOM_ZONE'
        }
      },
      headers: getAppleHeaders(),
      jar: jar,
      resolveWithFullResponse: true,
      json: true
    };
    rp(options).then(response => {
      var results = response.body.records[0];
      var photosCount = results.fields.photosCount.value;
      var videosCount = results.fields.videosCount.value;
      totalMedia = photosCount+videosCount;
      console.log('Found ' + photosCount + ' photos and ' + videosCount + ' videos');

      dispatch(moduleActions.changeModule(ModuleType.PROCESS, "Meta decrypting media..."));
      dispatch(findAllLocations(0));
    }).catch(err => {
      dispatch(alertActions.error("Couldn't get library statistics!"));
    });
  };
}

function findAllLocations(startRank){
  return dispatch=> {
    var options = {
      method: 'POST',
      uri: 'https://p27-ckdatabasews.icloud.com/database/1/com.apple.photos.cloud/production/private/records/query?remapEnums=true&ckjsBuildVersion=1915ProjectDev34&ckjsVersion=2.6.1&getCurrentSyncToken=true&clientBuildNumber=1915Project54&clientMasteringNumber=1915B78&clientId=' + clientID + '&dsid=' + appleDSID,
      body: {
        desiredKeys: ["locationEnc", "assetDate", "masterRef", "resJPEGMedRes", "resJPEGThumbRes", "resOriginalRes", "resVidMedRes", "itemType"],
        query: {
          filterBy: [{fieldName: "startRank", comparator: "EQUALS", fieldValue: {value: startRank, type: "INT64"}}, {fieldName: "direction", comparator: "EQUALS", fieldValue: {value: "ASCENDING", type: "STRING"}}],
          recordType: "CPLAssetAndMasterByAssetDateWithoutHiddenOrDeleted"
        },
        resultsLimit: 100,
        zoneID: {
          ownerRecordName: zoneOwnerName,
          zoneName: 'PrimarySync',
          zoneType: 'REGULAR_CUSTOM_ZONE'
        }
      },
      headers: getAppleHeaders(),
      jar: jar,
      resolveWithFullResponse: true,
      json: true
    };

    rp(options).then(response => {
      var records = response.body.records;
      var masterRecords = {};//If iCloud API ever doesn't order assets->records, then this needs to be changed.
      if(records.length > 0){
        records.forEach(function(record){
          if(record.recordType == 'CPLAsset'){
              if(typeof record.fields['locationEnc'] == 'object' && typeof record.fields['assetDate'] == 'object'){
              var encodedLoc = record.fields['locationEnc'].value;
              var assetDate = record.fields['assetDate'].value;
              var recordName = record.fields['masterRef'].value['recordName'];

              if(encodedLoc != ''){
                if(encodedLoc.startsWith("YnBsaXN0")){//Base64 BPList Style
                  var parsed = bplist.parseBuffer(Buffer.from(encodedLoc, 'base64'))[0];
                  var lat = parsed.lat;
                  var lon = parsed.lon;
                  console.log("Adding!" + assetDate);
                  MapService.addMedia({recordName, lat, lon, assetDate, ...masterRecords[recordName]});
                  return;
                }
                //Base64 XML style
                var dom = parser.parseFromString(atob(encodedLoc));
                var keyElements = dom.getElementsByTagName("key");

                if(keyElements.length > 0){
                  var latIndex = 0;
                  var lonIndex = 0;

                  for(var i = 0; i != keyElements.length;i++){
                    var element = keyElements[i];
                    if(element.innerHTML == 'lat'){
                      latIndex = i;
                    }else if(element.innerHTML == 'lon'){
                      lonIndex = i;
                    }
                  }

                  var realElements = dom.getElementsByTagName("real");

                  var lat = parseFloat(realElements[latIndex].innerHTML);
                  var lon = parseFloat(realElements[lonIndex].innerHTML);

                  console.log("Adding!" + assetDate);
                  MapService.addMedia({recordName, lat, lon, assetDate, ...masterRecords[recordName]});
                  if(startRank == 0){
                    console.log("Adding with assetDate: " + new Date(assetDate).getFullYear());
                  }
                }
              }

            }
          }else if(record.recordType == 'CPLMaster'){
            console.log(JSON.stringify(record));
            var recordName = record['recordName'];
            var jpegOptimized = "";
            var jpegThumb = "";
            if(typeof record.fields['resJPEGMedRes'] == "object"){
              jpegOptimized = record.fields['resJPEGMedRes'].value['downloadURL'];
            }else if(typeof record.fields['resJPEGThumbRes'] == "object"){
              jpegOptimized = record.fields['resJPEGThumbRes'].value['downloadURL'];
            }
            jpegThumb = (typeof record.fields['resJPEGThumbRes'] == "object") ? record.fields['resJPEGThumbRes'].value['downloadURL'] : jpegOptimized;
            var originalResourceURL = record.fields['resOriginalRes'].value['downloadURL'];
            var itemType = record.fields['itemType'].value;//png,jpg,heic,mpeg-4,etc...
            if(itemType == 'com.apple.quicktime-movie'){
              if(typeof record.fields['resVidMedRes'] == "object"){
                originalResourceURL = record.fields['resVidMedRes'].value['downloadURL'];//Windows/Linux won't support quicktime MOV
              }
            }
            masterRecords[recordName] = {jpegOptimized, jpegThumb, originalResourceURL, itemType};
          }
        });
        dispatch(moduleActions.changeModule(ModuleType.PROCESS, "Meta decrypting media " + startRank + "/" + totalMedia));
        dispatch(findAllLocations(startRank+50));
        return;
      }
      //Finished
      dispatch(moduleActions.changeModule(ModuleType.MAP));
    }).catch(err => {
      console.log("ERR: " + err);
      console.log(err);
    });
  };
}

function newClientID() {
  var structure = [8, 4, 4, 4, 12];
  var chars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
  var id = structure.map(function(part) {
    var partStr = "";
    for (var i = 0; i < part; i++) {
      partStr += chars[Math.trunc(Math.random() * chars.length)];
    }
    return partStr;
  });
  return id.join("-");
};


function getAppleHeaders(){
  return {
    'X-Apple-ID-Session-Id': appleSessionID,
    'X-Apple-Widget-Key': appleWidgetKey,
    'X-Apple-Session-Token': appleSessionToken,
    'X-Apple-Twosv-Trust-Token': appleTrustToken,
    'X-Apple-I-FD-Client-Info': {
      'U': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
      'L': 'en-US',
      'Z': 'GMT-07:00',
      'V': '1.1',
      'F': ''
    },
    'scnt': appleSCNT,
    'origin': 'https://www.icloud.com'
  }
}
