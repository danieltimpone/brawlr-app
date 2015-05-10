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

  // Log stateChangeErrors to console
  $rootScope.$on("$stateChangeError", console.log.bind(console));

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
                returnedAuthData.username = returnedAuthData.facebook.displayName;
                fb.child('Users').child(returnedAuthData.facebook.id).set(returnedAuthData);
                returnedAuthData.isNewUser = true;
              }
              // Existing User. Update shit
              else {
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
  var myAvailableMatches = null;

  function shuffle(myArray) {
      var counter = myArray.length, temp, index;

      // While there are elements in the myArray
      while (counter > 0) {
          // Pick a random index
          index = Math.floor(Math.random() * counter);

          // Decrease counter by 1
          counter--;

          // And swap the last element with it
          temp = myArray[counter];
          myArray[counter] = myArray[index];
          myArray[index] = temp;
      }

      return myArray;
  };

  this.get = function(userId) {
    if (myAvailableMatches) {
      for (var i = 0; i < myAvailableMatches.length; i++) {
        if (myAvailableMatches[i].$id == userId) {
          myAvailableMatches[i].ready = true
          return myAvailableMatches[i]
        }
      }
    }
    // return $firebaseObject(fb.child('Users').child(userId));
  };


  this.getByIndex = function(cardIndex) {
    if (myAvailableMatches) {
        return myAvailableMatches[cardIndex]
      }
    return null;
  };

  this.availableMatches = function(userID, reload) {

    reload = reload || false;
    var result = [];
    if (!myAvailableMatches || reload) {
      cards.$loaded()
        .then(function(loadedCards) {
          // Iterate through cards
          for (var i = 0; i < loadedCards.length; i++) {
            // Make sure you're not getting yourself
            if (loadedCards[i].$id != userID) {
              result.push(loadedCards[i]);
            }
          }
          result = shuffle(result)
        })
        .catch(function(error) {
          console.log('Error:', error);
        });
      myAvailableMatches = result;
      return result;
    }
    else {
      return myAvailableMatches
    }

  };


});



app.controller('CardsCtrl', function($scope, $firebaseObject, Card, Match, $state, $ionicHistory) {
  $scope.user = fb.getAuth();
  $scope.cards = Card.availableMatches($scope.user.facebook.id);
  $scope.refresherEnabled = true;

  var ref = fb.child('Swipes').child($scope.user.facebook.id);
  var matchesRef = fb.child('Matches');
  
  $scope.doRefresh = function() {
    $scope.cards = Card.availableMatches($scope.user.facebook.id, true);
    $scope.detailedCard = null;
    $scope.$broadcast('scroll.refreshComplete');
  }

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
    if ($scope.cards.length < 1) {
        console.log("You ran out of cards!");
        $scope.cards = Card.availableMatches($scope.user.facebook.id, true);  
    }
  };

  $scope.showDetails = function(cardIndex) {
  // Disable sluggish animation
  $ionicHistory.nextViewOptions({
    disableAnimate: true,
  });
    $state.go('singleCard', {cardIndex: cardIndex}, {reload: false});
  };

});

app.controller('CardCtrl', function($scope, $stateParams, $state, $ionicHistory, Card) {
  
  $scope.detailedCard = Card.getByIndex($stateParams.cardIndex)

  $scope.myGoBack = function() {
      // Disable sluggish animation
      $ionicHistory.nextViewOptions({
          disableAnimate: true,
      });
      $ionicHistory.goBack();
  };
});

app.controller('ProfileCtrl', function($scope, $firebaseObject, $state, FacebookAuth) {
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
    templateUrl: 'templates/login.html',
    controller: 'LoginCtrl',
    data: {
      authRequired: false,
    },
  });

  $stateProvider.state('cards', {
    url: '/cards',
    templateUrl: 'templates/cards.html',
    controller: 'CardsCtrl',
    data: {
      authRequired: true,
    },
  });

  $stateProvider.state('singleCard', {
    url: 'singleCard/:cardIndex',
    templateUrl: 'templates/cards.single.html',
    controller: 'CardCtrl',
    data: {
      authRequired: true,
    },
  });

  $stateProvider.state('profile', {
    url: '/profile',
    views: {
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

app.controller('AppCtrl', function($scope, $ionicPopover, $state) {
  $scope.user = fb.getAuth();
  $scope.headerClicked = function () {
    $state.go('cards', {}, {});
  };

});
