// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
var app = angular.module('starter', ['ionic', 'ionic.contrib.ui.tinderCards', 'firebase', 'ngCordovaOauth', 'ui.router']);
var fb = new Firebase('https://brawlr.firebaseio.com');

// do all the things ionic needs to get going
app.run(function($ionicPlatform, $rootScope, $state) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      StatusBar.styleDefault();
    }
  });

  // Prevent unAuthed users from viewing auth-required states
  $rootScope.$on('$stateChangeStart', function(event, toState) {
    if (toState.data.authRequired) {
      if (!fb.getAuth()) {
        event.preventDefault();
        $state.go('login', {}, {reload: true});
      }
    }
  });

});

// This is a factory
app.factory('FacebookAuth', function($cordovaOauth, $firebaseAuth, $q, $firebaseObject) {
  var fbAuth = $firebaseAuth(fb);
  return {
    login: function() {
      return $q(function(resolve, reject) {
        $cordovaOauth.facebook('917369228283594', ['email, public_profile']).then(function(result) {
          fbAuth.$authWithOAuthToken('facebook', result.access_token).then(function(returnedAuthData) {
            returnedAuthData.picture = 'http://graph.facebook.com/' + returnedAuthData.facebook.id + '/picture?width=300&height=300';
            var userInDatabase = $firebaseObject(fb.child('Users').child(returnedAuthData.facebook.id));

            userInDatabase.$loaded().then(function(userObject) {
              // How the fuck do you figure out if the user exists already?!?!?
              var isNewUser = true;
              angular.forEach(userObject, function(value, key) {
                isNewUser = false;
              });

              // New User.  Fill in everything
              if (isNewUser) {
                console.log('Creating new user!');
                returnedAuthData.username = returnedAuthData.facebook.displayName;
                fb.child('Users').child(returnedAuthData.facebook.id).set(returnedAuthData);
                returnedAuthData.isNewUser = true;
              }
              // Existing User. Update shit
              else {
                console.log('Logging in existing user');
                userObject.picture = 'http://graph.facebook.com/' + returnedAuthData.facebook.id + '/picture?width=300&height=300';
                userObject.facebook = returnedAuthData.facebook;
                userObject.expires = returnedAuthData.expires;
                userObject.token = returnedAuthData.token;
                userObject.$save();
                returnedAuthData.isNewUser = false;
              }
            });

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
    }
  };
});

app.controller('LoginCtrl', function($scope, $firebaseObject, $state, FacebookAuth) {
  //  This function will be used to bind the user data to the scope
  function bindToProfile(authData) {
    var ref = fb.child('Users').child(authData.facebook.id);
    var syncedProfile = $firebaseObject(ref);
    syncedProfile.$bindTo($scope, 'user');
  }

  // Initialize non-logged in user
  $scope.user = fb.getAuth();
  // Get authData.  Bind it to profile if it exists
  if ($scope.user) {
    $state.go('cards', {}, {reload: true});
  }

  $scope.login = function() {
    var authPromise = FacebookAuth.login();
    authPromise.then(function(authData) {
      if (authData) {
        if (authData.isNewUser) { 
          console.log('Created new user. Goin to profile setup');
          $state.go('profile', {}, {reload: true});
        } 
        else {
          console.log('Existing user logged in.  Going to cards');
          $state.go('cards', {}, {reload: true});
        }
      }
      else {
        console.log('Authentication Failed');
      }
    });
  };

  $scope.logout = function() {
    FacebookAuth.logout();
    $scope.user = null;
  };

});

app.service('Match', function($q, $firebaseObject) {
  var ref = fb.child('Swipes');

  this.isMatch = function(swipedUser, currentUser) {

    return $q(function(resolve, reject) {
      var rightOnCurrent =  $firebaseObject(ref.child(swipedUser).child(currentUser).child('swipedRight'));

      rightOnCurrent.$loaded().then(function(current) {
        if (current.$value == 'True') {
          resolve(true);
        }
        else {
          resolve(false);
        }
      });
    });
  };

});

app.service('Card', function($firebaseArray, $firebaseObject) {
  var cards = $firebaseArray(fb.child('Users'));

  this.get = function(userId) {
    return $firebaseObject(fb.child('Users').child(userId));
  },

  this.availableMatches = function(userID) {
    var result = [];

    cards.$loaded()
      .then(function(loadedCards) {
        // Iterate through cards
        for (var i = 0; i < loadedCards.length; i++) {
          // Make sure you're not getting yourself
          if (loadedCards[i].$id != userID) {
            result.push(loadedCards[i]);
          }
        }
      })
      .catch(function(error) {
        console.log('Error:', error);
      });
    return result;
  };

});

app.controller('CardsCtrl', function($scope, $firebaseObject, Card, Match) {
  $scope.user = fb.getAuth();
  $scope.cards = Card.availableMatches($scope.user.facebook.id);

  var ref = fb.child('Swipes').child($scope.user.facebook.id);
  var matchesRef = fb.child('Matches');

  $scope.cardSwipedLeft = function(index) {
    $scope.swipedUser = $scope.cards[index].$id;
    ref.child($scope.swipedUser).set({'swipedRight' : 'False'});
    console.log('Left swipe');
  };

  $scope.cardSwipedRight = function(index) {
    $scope.swipedUser = $scope.cards[index].$id;
    var myMatch = Match.isMatch($scope.swipedUser, $scope.user.facebook.id);
    myMatch.then(function(matched) {
      ref.child($scope.swipedUser).set({'swipedRight' : 'True'});
      if (matched) {
        var matchId = $scope.swipedUser + $scope.user.facebook.id;
        matchesRef.child(matchId).child('Messages').set({'default': 'He called you a bitch'});
      }
    });
  };

  $scope.cardDestroyed = function(index) {
    $scope.cards.splice(index, 1);
  };

});

app.controller('ProfileCtrl', function($scope, $firebaseObject, FacebookAuth) {
  $scope.user = fb.getAuth();
  var ref = fb.child('Users').child($scope.user.facebook.id);
  var syncedProfile = $firebaseObject(ref);
  syncedProfile.$bindTo($scope, 'user');

  $scope.logout = function() {
    FacebookAuth.logout();
    $scope.user = null;
    $state.go('login', {}, {reload: true});
  };

});

app.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
  $stateProvider.state('login', {
    url: '/login',
    views: {
      'login': {
        templateUrl: 'templates/login.html',
        controller: 'LoginCtrl',
      }
    },
    data: {
      authRequired: false,
    },
  });

  $stateProvider.state('cards', {
    url: '/cards',
    views: {
      'cards': {
        templateUrl: 'templates/cards.html',
        controller: 'CardsCtrl',
      },
    },
    data: {
      authRequired: true,
    },
  });

  $stateProvider.state('profile', {
    url: '/profile',
    'views': {
      'profile': {
        templateUrl: 'templates/profile.html',
        controller: 'ProfileCtrl',
      },
    },
    data: {
      authRequired: true,
    },
  });

  $urlRouterProvider.otherwise('/login');

  $ionicConfigProvider.tabs.position('top');
  $ionicConfigProvider.navBar.alignTitle('center');
});

app.controller('AppCtrl', function($scope, $ionicPopover) {

  $ionicPopover.fromTemplateUrl('templates/popover.html', {
    scope: $scope,
  }).then(function(popover) {
    $scope.popover = popover;
  });

  $scope.openPopover = function($event) {
    console.log('POPOVER OPENING');
    $scope.popover.show($event);
  };
  $scope.closePopover = function() {
    console.log('POPOVER CLOSING');
    $scope.popover.hide();
  };
  //Cleanup the popover when we're done with it!
  $scope.$on('$destroy', function() {
    $scope.popover.remove();
  });
  // Execute action on hide popover
  $scope.$on('popover.hidden', function() {
    // Execute action
  });
  // Execute action on remove popover
  $scope.$on('popover.removed', function() {
    // Execute action
  });
});
