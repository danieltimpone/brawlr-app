// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
var app = angular.module("starter", ["ionic", 'ionic.contrib.ui.tinderCards', "firebase"]);

// do all the things ionic needs to get going
app.run(function($ionicPlatform) {
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
    var ref = new Firebase('https://brawlr.firebaseio.com');
    var users = $firebase(ref);
    $scope.picture = 'img/pic1.jpg'
    $scope.userName = 'Not Logged In'

    $scope.user = authData;
    if ($scope.user) {
      $scope.picture = 'http://graph.facebook.com/' + $scope.user.facebook.id + '/picture?width=300&&height=300';
      $scope.userName = $scope.user.facebook.cachedUserProfile.first_name;
      users.$update($scope.userName, {
        picture: 'http://graph.facebook.com/' + $scope.user.facebook.id + '/picture?width=300&&height=300',
      });
    }


  });
});

app.service('Card', function ($firebase, FBURL) {
  var ref = new Firebase(FBURL);
  var cards = $firebase(ref.child('Users')).$asArray();
  console.log(cards)
  
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

app.controller('CardsCtrl', function($scope, TDCardDelegate, Card) {
  console.log("App running");
    $scope.cards = Card.all;
    console.log($scope.cards);

    var cardTypes = [
        { image: 'img/pic1.jpg', title: 'Ali', _id: 0, description: "Float like a butterfly; sting like a bee"},
        { image: 'img/pic2.jpg', title: 'Kimbo', _id: 1, description: 'I have no professional training'},
        { image: 'img/pic3.jpg', title: 'Bruce', _id: 2, description: "Goodmornings are bad for you"},
    ];

    //$scope.cards = [];
    $scope.detailed_view = false;
    $scope.addCard = function(i) {
        var newCard = cardTypes[Math.floor(Math.random() * cardTypes.length)];
        newCard.id = Math.random();
        $scope.cards.push(angular.extend({}, newCard));
    }

    for(var i = 0; i < 3; i++) $scope.addCard();

    $scope.cardSwipedLeft = function(index) {
        console.log('Left swipe');
    }

    $scope.cardSwipedRight = function(index) {
        console.log('Right swipe');
    }

    $scope.cardDestroyed = function(index) {
        $scope.cards.splice(index, 1);
        console.log('Card removed');
    }
});

app.controller('ProfileCtrl', function ($scope) {
    $scope.title = 'Profile Page';
    $scope.body = 'PROFILE';
});

app.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider.state('login', {
      url: '/login',
      views: {
        login: {
          templateUrl: 'templates/login.html'
        }
      }
    })

    $stateProvider.state('cards', {
      url: '/cards',
      views: {
        cards: {
          templateUrl: 'templates/cards.html'
        }
      }
    })

    $stateProvider.state('profile', {
      url: '/profile',
      views: {
        profile: {
          templateUrl: 'templates/profile.html'
        }
      }
    })

    $urlRouterProvider.otherwise('/login');
});

app.controller('AppCtrl', function($scope, $ionicPopover, $location) {
  console.log("App running");
  $scope.demo = 'android';
  $scope.setPlatform = function(p) {
    document.body.classList.remove('platform-ios');
    document.body.classList.remove('platform-android');
    document.body.classList.add('platform-' + p);
    $scope.demo = p;
  }

  // .fromTemplate() method
  var template = '<ion-popover-view><ion-header-bar> <h1 class="title">My Popover Title</h1> </ion-header-bar> <ion-content> Hello! </ion-content></ion-popover-view>';

  $scope.popover = $ionicPopover.fromTemplate(template, {
    scope: $scope
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