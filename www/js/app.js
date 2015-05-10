// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
var app = angular.module("starter", ["ionic", 'ionic.contrib.ui.tinderCards', "firebase", 'ngCordovaOauth', 'ui.router']);
var fb = new Firebase("https://brawlr.firebaseio.com");
// do all the things ionic needs to get going
app.run(function($ionicPlatform, $rootScope, $state) {
    $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });

  // On sate
  $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams){
    if (toState.data.authRequired) {// && !$firebaseAuth.isAuthenticated()){ //Assuming the AuthService holds authentication logic
      // User isn’t authenticated
      firebase_connect = new Firebase('https://brawlr.firebaseio.com/')
      var my_authData = firebase_connect.getAuth();
      if (!my_authData) {
        event.preventDefault(); 
        $state.go('login', {}, {reload: true})        
      }
    }
  });

});

// change this URL to your Firebase
app.constant('FBURL', 'https://brawlr.firebaseio.com');

// constructor injection for a Firebase reference
app.service('Root', ['FBURL', Firebase]);

// create a custom Auth factory to handle $firebaseAuth
app.factory('Auth', function($firebaseAuth, $firebaseObject, Root, $timeout){

  var auth = $firebaseAuth(Root);
  return {
    // helper method to login with multiple providers
    loginWithProvider: function loginWithProvider(provider) {
      return auth.$authWithOAuthPopup(provider);
    },
    // convenience method for logging in with Facebook
    loginWithFacebook: function login() {
      return this.loginWithProvider("facebook");
    },
    // wrapping the unauth function
    logout: function logout() {
      console.log('Logging out');
      auth.$unauth();
    },
    // wrap the $onAuth function with $timeout so it processes
    // in the digest loop.
    onAuth: function onLoggedIn(callback) {
      auth.$onAuth(function(authData) {
        $timeout(function() {
          callback(authData);
        });
      });
    }
  };
});


app.controller("LoginCtrl", function($scope, Auth, Firebase, $cordovaOauth,  $firebaseAuth, $firebaseObject) {

  // Initialize non-logged in user
  var auth = $firebaseAuth(fb);
  firebase_connect = new Firebase('https://brawlr.firebaseio.com/')
  var my_authData = firebase_connect.getAuth();
  $scope.user = my_authData
  if ($scope.user) {
    var ref = new Firebase('https://brawlr.firebaseio.com/Users/' + $scope.user.facebook.id)
    var synced_profile = $firebaseObject(ref);
    synced_profile.$bindTo($scope, "user");
  }

  $scope.login = function() {
      $cordovaOauth.facebook("917369228283594", ["email"]).then(function(result) {
          auth.$authWithOAuthToken("facebook", result.access_token).then(function(authData) {
              console.log('We are logged in!', authData);
              $scope.user = authData;
          }, function(error) {
              console.error("ERROR: " + error);
          });
      }, function(error) {
          console.log("ERROR: " + error);
      });
  }
  $scope.logout = function() {
    auth.$unauth();
    $scope.user = null;
    $scope.picture = null;
    $scope.userName = null;    
  }

});

app.service('Match', function($q, $firebaseArray, $firebaseObject, $firebaseAuth, FBURL){
  var ref = fb.child('Swipes');

  this.isMatch = function(swipedUser, currentUser) {

    return $q(function(resolve,reject){
      var rightOnCurrent =  $firebaseObject(ref.child(swipedUser).child(currentUser).child('swipedRight'));

      rightOnCurrent.$loaded().then(function(current){
        if(current.$value == "True") {
          console.log("returning true");
          resolve(true);
        }
        else{
          console.log("returning false");
          resolve(false);
        }
      });
    });
    
    
  }
  this.saveMatch = function(swipedUser, currentUser) {

  }
});

app.service('Card', function ($firebaseArray, $firebaseObject, FBURL) {
  var cards = $firebaseArray(new Firebase(FBURL + '/Users'));

  this.create = function (user) {
      return users.$add(user);
  },
  this.get = function(userId) {
      return $firebaseObject(new Firebase(FBURL + '/Users/' + userId));
  },
  this.delete = function (user) {
      return users.$remove(user);
  }

  this.available_matches = function(user_id) {
    var result = []

    cards.$loaded()
      .then(function(x) {
        for (var i=0; i<x.length; i++) {
          if (x[i].$id != user_id) {
            result.push(x[i]);
          }
        }
      })
      .catch(function(error) {
        console.log("Error:", error);
      });
      return result;
  }

});

app.controller('CardsCtrl', function($scope, $firebaseAuth, TDCardDelegate, Card, $firebase, FBURL, $firebaseObject, $firebaseArray, Match) {
    var my_authData = firebase_connect.getAuth();
    $scope.user = my_authData

    $scope.cards = Card.available_matches($scope.user.facebook.id)

    var ref = new Firebase(FBURL + '/Swipes');
    var newRef = new Firebase(FBURL +'/Swipes/' + $scope.user.facebook.id);
    var swipes = $firebaseObject(newRef);

    
    $scope.cardSwipedLeft = function(index) {
      $scope.swipedUser = $scope.cards[index].$id;
      console.log(JSON.stringify($scope.cards));
      $scope.swipedUser = $scope.cards[index].$id;

      newRef.child($scope.swipedUser).set({'swipedRight' : 'False'});

      console.log('Left swipe');
    }

    $scope.cardSwipedRight = function(index) {
        $scope.swipedUser = $scope.cards[index].$id;
        console.log("Testing match truthiness")
        my_match = Match.isMatch($scope.swipedUser, $scope.user.facebook.id);
        my_match.then(function(matched){
          newRef.child($scope.swipedUser).set({'swipedRight' : 'True'});
        });
        
    }

    $scope.cardDestroyed = function(index) {
        $scope.cards.splice(index, 1);
        console.log('Card removed');
    }
});

app.controller('ProfileCtrl', function ($scope, $firebaseObject) {

    firebase_connect = new Firebase('https://brawlr.firebaseio.com/')
    var my_authData = firebase_connect.getAuth();
    $scope.user = my_authData

    var ref = new Firebase('https://brawlr.firebaseio.com/Users/' + $scope.user.facebook.id)
    var synced_profile = $firebaseObject(ref);
    synced_profile.$bindTo($scope, "user");
    console.log(JSON.stringify($scope.user))
    

    $scope.title = $scope.userName + "'s Profile";

});

app.config(function($stateProvider, $urlRouterProvider) {
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
    })

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
    })

    $stateProvider.state('profile', {
      url: '/profile',
      'views': {
        profile: {
          templateUrl: 'templates/profile.html',
          controller: 'ProfileCtrl',
        },
      },
      data: {
        authRequired: true,
      },
    })

    $urlRouterProvider.otherwise('/login');
});

app.controller('AppCtrl', function($scope, $ionicPopover, $location) {


  $ionicPopover.fromTemplateUrl('templates/popover.html', {
    scope: $scope,
  }).then(function(popover) {
    $scope.popover = popover;
  });

  $scope.openPopover = function($event) {
    console.log("POPOVER OPENING");
    $scope.popover.show($event);
  };
  $scope.closePopover = function() {
    console.log("POPOVER CLOSING");
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