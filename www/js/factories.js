angular.module('brawlr.factories', [])

// This is a factory.  How do factory?
.factory('FacebookAuth', function($cordovaOauth, $firebaseAuth, $q, $firebaseObject, $rootScope) {
  var fbAuth = $firebaseAuth(fb);

  return {
    login: function() {
      return $q(function(resolve, reject) {
        $cordovaOauth.facebook('917369228283594', ['public_profile']).then(function(result) {
          fbAuth.$authWithOAuthToken('facebook', result.access_token).then(function(returnedAuthData) {
              console.log("Searching for user with FBID: " + returnedAuthData.uid);
              userKeyRef = fb.child('UserKeys').child(returnedAuthData.uid);
              userKeyRef.once('value', function(userKeySnapshot) {
                userKey = userKeySnapshot.val();
                // New user
                if (userKey === null) {

                  
                  // Add two records into the Database
                  // uniqueKey: FBID  |and|  FBID: uniqueKey
                  // It's not beautiful, but it allows us to 1) Hide FBIDs, and 2) Do very fast lookups

                  // Writing stuff to Database
                  // uniqueKey: FBID
                  newUserRef = fb.child('Users').push({
                    'facebookID': returnedAuthData.uid,
                  });
                  
                  // get uniqueKey
                  newUserKey = newUserRef.key();
                  console.log("Creating new user with id: " + newUserKey);

                  // FBID: uniqueKey
                  fb.child('UserKeys').child(returnedAuthData.uid).set(newUserKey);

                  // uniqueKey: {profile information}
                  fb.child('Cards').child(newUserKey).set({
                      'picture': 'http://graph.facebook.com/' + returnedAuthData.facebook.id.replace('facebook:', '') + '/picture?width=600&height=600',
                      'username':  returnedAuthData.facebook.displayName,
                      'zip': "",
                      'height': "",
                      'weight': "",
                      'description': "",
                  },
                  function() {
                    console.log('User created.  Resolving login()');
                    $rootScope.userData = returnedAuthData;
                    window.localStorage.userKey = newUserKey;
                    $rootScope.userKey = newUserKey;
                    returnedAuthData.isNewUser = true;
                    resolve(returnedAuthData);
                  });

                 }
                 else {
                    returnedAuthData.isNewUser = false;
                    window.localStorage.userKey = userKeySnapshot.val();
                    $rootScope.userData = returnedAuthData;
                    $rootScope.userKey = userKeySnapshot.val();
                    console.log("Logging in returning user: " + userKeySnapshot.val() + " and resolving login");
                    resolve(returnedAuthData);
                 }
              });
          }, function(error) {
              console.error('ERROR in $authWithOAuthToken: ' + error);
              resolve(null);
            });
        }, function(error) {
          console.log('ERROR in cordovaOauth: ' + error);
          resolve(null);
        });
      });
    },
    logout: function() {
      fbAuth.$unauth();
      $rootScope.userData = null;
      window.localStorage.userKey = null;
    },
  };
})

// This is a factory.  It doesn't do shit right now.
.factory('ProfilePics', function($cordovaOauth, $firebaseAuth, $q, $firebaseObject, FacebookAuth) {
  user = FacebookAuth.getAuthData();
  var profileRef = fb.child('Cards').child(_authData.userKey);
  return {
    getPic: function() {
      return $q(function(resolve, reject) {
        f_one = profileRef.child('pic_one');
        f_one.once('value', function(snap) {
          var payload = snap.val();
          if (payload !== null) {
            resolve(payload);
          }
        });  
      });
    },
  };
});
