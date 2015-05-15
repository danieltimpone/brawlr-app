angular.module('brawlr.factories', [])

// This is a factory.  How do factory?
.factory('FacebookAuth', function($cordovaOauth, $firebaseAuth, $q, $firebaseObject) {
  var fbAuth = $firebaseAuth(fb);

  _authData = null;
  _profile = null;

  return {
    login: function() {
      return $q(function(resolve, reject) {
        $cordovaOauth.facebook('917369228283594', ['public_profile']).then(function(result) {
          fbAuth.$authWithOAuthToken('facebook', result.access_token).then(function(returnedAuthData) {
            returnedAuthData.picture = 'http://graph.facebook.com/' + returnedAuthData.facebook.id.replace('facebook:', '') + '/picture?width=600&height=600';
            var userInDatabase = $firebaseObject(fb.child('Users').child('facebook:' + returnedAuthData.facebook.id));

            userInDatabase.$loaded().then(function(userObject) {

              // Ugly way to check if user is new or not
              var isNewUser = true;
              var numAttributes = 0;
              angular.forEach(userObject, function(value, key) {
                numAttributes += 1;
              });
              if (numAttributes > 2) {
                isNewUser = false;
              }

              // New User.  Fill in everything
              if (isNewUser) {
                returnedAuthData.username = returnedAuthData.facebook.displayName;
                fb.child('Users').child('facebook:' + returnedAuthData.facebook.id).set(returnedAuthData);
                returnedAuthData.isNewUser = true;
              }
              // Existing User. Update shit
              else {
                userObject.picture = 'http://graph.facebook.com/' + returnedAuthData.facebook.id.replace('facebook:', '') + '/picture?width=600&height=600';
                userObject.facebook = returnedAuthData.facebook;
                userObject.expires = returnedAuthData.expires;
                userObject.token = returnedAuthData.token;
                userObject.$save();
                returnedAuthData.isNewUser = false;
              }
              _profile = userObject;
            });
            _authData = fb.getAuth();
            _authData.facebook.id = 'facebook:' + _authData.facebook.id;
            resolve(returnedAuthData);
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
      _authData = null;
      _profile = null;
    },
    // If the _authData already exists, just grab that.
    //    Else, get auth data and add 'facebook:' to it if it's not already there.
    getAuthData: function() {
      if (_authData) {
        return _authData;
      }
      // Buuut, if somethin weird happens and it's not:
      else {
        _authData = fb.getAuth();
        if (_authData) {
          if (_authData.facebook.id.indexOf('facebook:') == - 1) {
            _authData.facebook.id = 'facebook:' + _authData.facebook.id;
          }
          return _authData;
        }
      }
    },
    getUserID: function() {
      return _authData.facebook.id;
    },
    getProfile: function() {
      return $q(function(resolve, reject) {
        // If the profile is already loaded, send that. (Profile gets loaded in login function)
        if (_profile) {
          resolve(_profile);
        }
        if (_authData) {
          userObj = $firebaseObject(fb.child('Users').child(_authData.facebook.id));
          userObj.$loaded()
            .then(function(loadedProfile) {
              _profile = loadedProfile;
              resolve(_profile);
          });
        }
      });
    }
  };
})

// This is a factory.  It doesn't do shit right now.
.factory('ProfilePics', function($cordovaOauth, $firebaseAuth, $q, $firebaseObject, FacebookAuth) {
  user = FacebookAuth.getAuthData();
  var profileRef = fb.child('Users').child(user.facebook.id);
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
