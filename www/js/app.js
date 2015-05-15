// Ionic Starter 

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'brawlr' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
var fb = new Firebase('https://brawlr.firebaseio.com');
angular.module('brawlr', [
  'ionic',
  'ionic.contrib.ui.tinderCards',
  'firebase',
  'ngCordovaOauth',
  'ui.router',
  'brawlr.services',
  'brawlr.factories',
  'brawlr.controllers',
])

// do all the things ionic needs to get going
.run(function($ionicPlatform, $rootScope, $state) {

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

  // Log stateChangeErrors to console. I don't know if this works.
  $rootScope.$on("$stateChangeError", console.log.bind(console));

  // Prevent unAuthed users from viewing auth-required states
  $rootScope.$on('$stateChangeStart', function(event, toState) {
    if (toState.data.authRequired && !fb.getAuth()) {
        event.preventDefault();
        $state.go('login', {}, {reload: true});
    }
  });

})

.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
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
    resolve:{
      'MyCardPromise':function(Card){
        return Card.promise;
      }
    },
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
    resolve:{
      'MyMatchPromise':function(Match){
        return Match.promise;
      }
    },
    data: {
      authRequired: true,
    },
  });

  $stateProvider.state('singleMatch', {
    url: 'singleCard/:matchIndex',
    templateUrl: 'templates/matches.single.html',
    controller: 'MatchCtrl',
    data: {
      authRequired: true,
    },
  });

  $urlRouterProvider.otherwise('/login');

  $ionicConfigProvider.tabs.position('top');
  $ionicConfigProvider.navBar.alignTitle('center');
});