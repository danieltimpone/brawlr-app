// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
var app = angular.module("starter", ["ionic", 'ionic.contrib.ui.tinderCards', "firebase"]);

// do all the things ionic needs to get going
app.run(function($ionicPlatform, $rootScope) {
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
  // if (toState.data.authRequired) {// && !$firebaseAuth.isAuthenticated()){ //Assuming the AuthService holds authentication logic
  //   // User isn’t authenticated
  //   console.log("User tried to access " + toState + ", but they're not logged in!")
  //   // $state.transitionTo("login");
  //   event.preventDefault(); 
  // }
});

});

// change this URL to your Firebase
app.constant('FBURL', 'https://brawlr.firebaseio.com');

// constructor injection for a Firebase reference
app.service('Root', ['FBURL', Firebase]);

// create a custom Auth factory to handle $firebaseAuth
app.factory('Auth', function($firebaseAuth, $firebase, Root, $timeout){
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
          callback(authData, $firebase);
        });
      });
    }
  };
});


app.controller("LoginCtrl", function($scope, Auth) {
  // Initially set no user to be logged in
  $scope.user = null;
  $scope.picture = 'img/pic1.jpg'
  $scope.userName = 'Not Logged In'


  // Logs a user in with Facebook
  // Calls $authWithOAuthPopup on $firebaseAuth
  // This will be processed by the InAppBrowser plugin on mobile
  // We can add the user to $scope here or in the $onAuth fn
  $scope.login = function scopeLogin() {
    Auth.loginWithFacebook()
    .then(function(authData){
      console.log('We are logged in!', authData);
    })
    .catch(function(error) {
      console.error(error);
    });
  };

  // Logs a user out
  $scope.logout = Auth.logout;

  // detect changes in authentication state
  // when a user logs in, set them to $scope
  Auth.onAuth(function(authData, $firebase) {
    var ref = new Firebase('https://brawlr.firebaseio.com/Users');
    var users = $firebase(ref);
    $scope.picture = 'img/pic1.jpg'
    $scope.userName = 'Not Logged In'

    $scope.user = authData;
    if ($scope.user) {
      console.log("Got a user:");
      $scope.picture = 'http://graph.facebook.com/' + $scope.user.facebook.id + '/picture?width=300&height=300';
      $scope.userName = $scope.user.facebook.cachedUserProfile.first_name;
      users.$update($scope.userName, {
        uid: $scope.user.uid,
        fbid: $scope.user.facebook.id,
        picture: 'http://graph.facebook.com/' + $scope.user.facebook.id + '/picture?width=300&height=300',
        accessToken: $scope.user.facebook.accessToken,
      });

      $scope.current_user = {
        uid: $scope.user.uid,
        fbid: $scope.user.facebook.id,
        picture: 'http://graph.facebook.com/' + $scope.user.facebook.id + '/picture?width=300&height=300',
        accessToken: $scope.user.facebook.accessToken,
      }
    }
  });

});


app.service('Card', function ($firebase, FBURL) {
  var ref = new Firebase(FBURL);
  var cards = $firebase(ref.child('Users')).$asArray();
  
  this.all = cards;
  this.create = function (user) {
      return users.$add(user);
  },
  this.get = function(userId) {
      return $firebase(ref.child('Users').child(userId)).$asObject();
  },
  this.delete = function (user) {
      return users.$remove(user);
  }
});

app.controller('CardsCtrl', function($scope, $firebaseAuth, TDCardDelegate, Card, $firebase, FBURL) {
    $scope.cards = Card.all;
    
    var ref = new Firebase(FBURL + '/Swipes');

    $scope.authObj = $firebaseAuth(ref);
    $scope.current_user = $scope.authObj.$getAuth();
    $scope.userName = $scope.current_user.facebook.cachedUserProfile.first_name;

    var newRef = new Firebase(FBURL +'/Swipes/' + $scope.userName)
    var swipes = $firebase(newRef);

    $scope.cardSwipedLeft = function(index) {
      
      $scope.swipedUser = $scope.cards[index].$id;
      console.log($scope.swipedUser);

      swipes.$update($scope.swipedUser, {
        swipedRight : "False"
      });

      console.log('Left swipe');
    }

    $scope.cardSwipedRight = function(index) {
        $scope.swipedUser = $scope.cards[index].$id;
          console.log($scope.swipedUser);

          swipes.$update($scope.swipedUser, {
            swipedRight : "True"
          });

        console.log('Right swipe');
    }

    $scope.cardDestroyed = function(index) {
        $scope.cards.splice(index, 1);
        console.log('Card removed');
    }
});

app.controller('ProfileCtrl', function ($scope, $firebase) {
    $scope.title = $scope.userName + "'s Profile";
    $scope.body = 'PROFILE';

    var ref = new Firebase('https://brawlr.firebaseio.com/Users');
});

app.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider.state('login', {
      url: '/login',
      views: {
        'login': {
          templateUrl: 'templates/login.html',
          controller: 'LoginCtrl',
          authRequired: true,
        }
      },
      data: {
        authRequired: true,
      },
    })

    $stateProvider.state('cards', {
      url: '/cards',
      views: {
        'cards': {
          templateUrl: 'templates/cards.html',
          controller: 'CardsCtrl',
          authRequired: true,
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
          authRequired: true,
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