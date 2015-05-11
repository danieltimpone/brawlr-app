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
    if (toState.data.authRequired && !fb.getAuth()) {
        event.preventDefault();
        $state.go('login', {}, {reload: true});
    }
  });

});

// This is a factory
app.factory('FacebookAuth', function($cordovaOauth, $firebaseAuth, $q, $firebaseObject) {
  var fbAuth = $firebaseAuth(fb);

  authData = null;

  return {
    login: function() {
      return $q(function(resolve, reject) {
        $cordovaOauth.facebook('917369228283594', ['public_profile']).then(function(result) {
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
            authData = fb.getAuth();
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
      authData = null;
    },
    getAuthData: function() {
      if (authData) {
        return authData;
      }
      else {
        authData = fb.getAuth();
        return authData;
      }
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
  console.log("Login Control");

  // Initialize non-logged in user
  $scope.user = FacebookAuth.getAuthData();
  // Get authData.  Bind it to profile if it exists
  if ($scope.user) {
    console.log("In LoginCtrl w/ $scope.user.  Going to cards.");
    $state.go('cards', {}, {reload: true, notify: true});
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

});

app.service('Match', function($q, $firebaseObject, $firebaseArray) {
  var swipes_ref = fb.child('Swipes');
  var users_ref = fb.child('Users');
  var matches = $firebaseArray(fb.child('Matches'));


  this.isMatch = function(swipedUser, currentUser) {

    return $q(function(resolve, reject) {
      var rightOnCurrent =  $firebaseObject(swipes_ref.child(swipedUser).child(currentUser).child('swipedRight'));

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

  myAvailableMatches = null;
  this.myMatchList = function(reload) {
    return $q(function(resolve, reject) {
      reload = reload || false;

      if (!myAvailableMatches || reload) {
        console.log("myMatchList reloading data");
        matches.$loaded().then(function(loadedMatches){
          myAvailableMatches = loadedMatches;
          console.log("myMatchList data resolved");
          resolve(loadedMatches);
        });
      }
      else {
        console.log("myMatchList Grabbin old matches");
        resolve(myAvailableMatches);
      }
    });
  };

});

app.service('Card', function($firebaseArray, $firebaseObject) {
  var cards = $firebaseArray(fb.child('Users'));
  var myAvailableCards = null;

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
  }

  this.get = function(userId) {
    if (myAvailableCards) {
      for (var i = 0; i < myAvailableCards.length; i++) {
        if (myAvailableCards[i].$id == userId) {
          myAvailableCards[i].ready = true;
          return myAvailableCards[i];
        }
      }
    }
    // return $firebaseObject(fb.child('Users').child(userId));
  };


  this.getByIndex = function(cardIndex) {
    if (myAvailableCards) {
        return myAvailableCards[cardIndex];
      }
    return null;
  };

  this.availableCards = function(userID, reload) {

    reload = reload || false;
    var result = [];
    if (!myAvailableCards || reload) {
      cards.$loaded()
        .then(function(loadedCards) {
          // Iterate through cards
          for (var i = 0; i < loadedCards.length; i++) {
            // Make sure you're not getting yourself
            if (loadedCards[i].$id != userID) {
              result.push(loadedCards[i]);
            }
          }
          result = shuffle(result);
        })
        .catch(function(error) {
          console.log('Error:', error);
        });
      myAvailableCards = result;
      return result;
    }
    else {
      return myAvailableCards;
    }

  };


});



app.controller('CardsCtrl', function($scope, $firebaseObject, $state, $ionicHistory, $ionicPopup, Card, Match, FacebookAuth) {
  $scope.user = FacebookAuth.getAuthData();
  $scope.cards = Card.availableCards($scope.user.facebook.id);
  $scope.refresherEnabled = true;

  var ref = fb.child('Swipes').child($scope.user.facebook.id);
  var matchesRef = fb.child('Matches');
  
  $scope.doRefresh = function() {
    $scope.cards = Card.availableCards($scope.user.facebook.id, true);
    $scope.detailedCard = null;
    $scope.$broadcast('scroll.refreshComplete');
  };

  $scope.cardSwipedLeft = function(index) {
    $scope.swipedUser = $scope.cards[index].$id;
    ref.child($scope.swipedUser).set({'swipedRight' : 'False'});
    console.log('Left swipe');
  };

  $scope.cardSwipedRight = function(index) {
    console.log('Right swipe');
    $scope.swipedUser = $scope.cards[index].$id;
    var myMatch = Match.isMatch($scope.swipedUser, $scope.user.facebook.id);
    myMatch.then(function(matched) {
      ref.child($scope.swipedUser).set({'swipedRight' : 'True'});
      if (matched) {
        myIDasInt = parseInt($scope.user.facebook.id);
        theirIDasInt = parseInt($scope.swipedUser);
        var matchId = Math.min(myIDasInt, theirIDasInt).toString() + Math.max(myIDasInt, theirIDasInt).toString();
        console.log("Creating match with ID: " + matchId);
        matchesRef.child(matchId).child('Messages').set({'default': 'He called you a bitch'});
        $scope.showMatchConfirm();
      }
    });
  };

   // A confirm dialog
   $scope.showMatchConfirm = function() {
     var confirmPopup = $ionicPopup.confirm({
       title: "You've got a match!",
       template: 'You ready to talk some shit?'
     });
     confirmPopup.then(function(res) {
       if(res) {
         $state.go('matches', {reload: false});
       } else {
         console.log('You are not sure');
       }
     });
   };


  $scope.cardDestroyed = function(index) {
    $scope.cards.splice(index, 1);
    if ($scope.cards.length < 1) {
        console.log("You ran out of cards!");
        $scope.cards = Card.availableCards($scope.user.facebook.id, true);  
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
  
  $scope.detailedCard = Card.getByIndex($stateParams.cardIndex);

  $scope.myGoBack = function() {
      // Disable sluggish animation
      $ionicHistory.nextViewOptions({
          disableAnimate: true,
      });
      $ionicHistory.goBack();
  };
});

app.controller('MatchesCtrl', function($scope, $firebaseObject, Match, $state, $ionicHistory, $firebaseArray, FacebookAuth, $q) {
  $scope.user = FacebookAuth.getAuthData();
  
  console.log("Loading Matches");
  myMatches = Match.myMatchList();
  myMatches.then(function(resolvedList) {
    $scope.myMatches = resolvedList;
    console.log("Matches have been loaded. Grabbing user data now.");

    $scope.matchedUsers = [];
    for (var i = 0; i < resolvedList.length; i++){
      otherGuysID = resolvedList[i].$id.replace($scope.user.facebook.id, '');
      $scope.matchedUsers.push($firebaseObject(fb.child('Users').child(otherGuysID)));
    }

  });

  $scope.doRefresh = function() {
    console.log("Loading Matches");
    myMatches = Match.myMatchList(true);
    myMatches.then(function(resolvedList) {
      $scope.myMatches = resolvedList;
      console.log("Matches have been loaded. Grabbing user data now.");

      $scope.matchedUsers = [];
      for (var i = 0; i < resolvedList.length; i++){
        otherGuysID = resolvedList[i].$id.replace($scope.user.facebook.id, '');
        $scope.matchedUsers.push($firebaseObject(fb.child('Users').child(otherGuysID)));
      }
      $scope.$broadcast('scroll.refreshComplete');
    });
  };
  
});

app.controller('ProfileCtrl', function($scope, $firebaseObject, $state, FacebookAuth) {
  $scope.user = FacebookAuth.getAuthData();
  var ref = fb.child('Users').child($scope.user.facebook.id);
  var syncedProfile = $firebaseObject(ref);
  syncedProfile.$bindTo($scope, 'user');

  $scope.logout = function() {
    FacebookAuth.logout();
    $state.go('login', {}, {reload: true, notify: true});
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
    templateUrl: 'templates/profile.html',
    controller: 'ProfileCtrl',
    data: {
      authRequired: true,
    },
  });

  $stateProvider.state('matches', {
    url: '/matches',
    templateUrl: 'templates/matches.html',
    controller: 'MatchesCtrl',
    data: {
      authRequired: true,
    },
  });

  $urlRouterProvider.otherwise('/login');

  $ionicConfigProvider.tabs.position('top');
  $ionicConfigProvider.navBar.alignTitle('center');
});

app.controller('AppCtrl', function($scope, $ionicPopover, $state, FacebookAuth) {
  $scope.user = FacebookAuth.getAuthData();
  $scope.headerClicked = function () {
    $state.go('cards', {}, {});
  };

});
