angular.module('brawlr.controllers', [])

 // AppCtrl is the parent to all other Controllers (see: index.html)
 // We use app control to set the root variables for the user's id/profile
.controller('AppCtrl', function($scope, $rootScope, $state, $firebaseObject, FacebookAuth) {
  loadingProfile = $firebaseObject(fb.child('Cards').child(window.localStorage.userKey));
  loadingProfile.$bindTo($scope, "userProfile").then(function() {
    console.log("AppCtrl has binded userProfile to $scope.userProfile"); // { foo: "bar" }
  });

  $scope.headerClicked = function () {
    $state.go('cards', {}, {});
  };
})


.controller('LoginCtrl', function($scope, $rootScope, $firebaseObject, $state, $ionicScrollDelegate, FacebookAuth) {

  // Get user from rootScope
  $scope.user = $rootScope.userData;
  if ($scope.user) {
    // If user is already logged in, send them to cards
    $state.go('cards', {}, {reload: true, notify: true});
  }

  // Log in button.  New users get sent to profile.  Returning users get sent to cards.
  $scope.login = function() {
    var authPromise = FacebookAuth.login();
    authPromise.then(function(authData) {
      console.log('login returned:');
      console.log(JSON.stringify(authData));
      if (authData) {
        if (authData.isNewUser) { 
          console.log("User logged in.  Going to: profile");
          $state.go('profile', {}, {reload: true});
        }
        else {
          console.log("User logged in.  Going to: cards");
          $state.go('cards', {}, {reload: true});
        }
      }
      else {
        console.log('Authentication Failed');
      }
    });
  };

  // This code tracks the user as they move through the carousel.
  $scope.showLeftArrow = false;
  $scope.showRightArrow = true;
  $scope.slideHasChanged = function(_index) {
    if (_index === 0) {
      $scope.showLeftArrow = false;
      $scope.showRightArrow = true;
      $ionicScrollDelegate.getScrollView().options.scrollingY = false;
    }
    if (_index == 1) {
      $scope.showLeftArrow = true;
      $scope.showRightArrow = true;
      $ionicScrollDelegate.getScrollView().options.scrollingY = false;
    }
    if (_index == 2) {
      $scope.showLeftArrow = true;
      $scope.showRightArrow = false;
      $ionicScrollDelegate.getScrollView().options.scrollingY = true;
    }
  };
})

// Profile control just kinda provides the buttons.
//  AppCtrl already has all the scope variables we need (userProfile)
.controller('ProfileCtrl', function($scope, $rootScope, $firebaseObject, $state, $ionicViewSwitcher, Firebase, FacebookAuth) {
  

  $scope.logout = function() {
    FacebookAuth.logout();
    $state.go('login', {}, {reload: true, notify: true});
  };

  $scope.swipeLeft = function() {
    $ionicViewSwitcher.nextDirection('forward'); // Set appropriate animation direction
    $state.go('cards', {}, {});
  };
})

//  CardsCtrl won't load until Card Service is finished (This is requirement defined in the $stateProvider "resolve" in app.js)
//  Once all that is loaded, CardsCtrl is pretty boring
.controller('CardsCtrl', function($scope, $rootScope, $firebaseObject, $state, $ionicHistory, $ionicPopup, Card, Match) {
  $scope.cards = Card.getCards();
  $scope.user = $rootScope.userData;
  userKey = window.localStorage.userKey;

  var ref = fb.child('Swipes').child(window.localStorage.userKey);
  
  var matchesRef = fb.child('Matches');
  var usersMatchesRef = fb.child('Users').child(userKey).child('Matches');
  
  $scope.doRefresh = function() {
    cardsLoading = Card.reloadCards();
    cardsLoading.then(function(){
      $scope.cards = Card.getCards();
      $scope.$broadcast('scroll.refreshComplete');
    });
  };

  $scope.cardSwipedLeft = function(index) {
    $scope.swipedUser = $scope.cards[index].$id;
    ref.child($scope.swipedUser).set({'swipedRight' : 'False'});
  };

  $scope.cardSwipedRight = function(index) {
    $scope.swipedUser = $scope.cards[index].$id;
    var myMatch = Match.isMatch($scope.swipedUser);
    myMatch.then(function(matched) {
      ref.child($scope.swipedUser).set({'swipedRight' : 'True'});
      if (matched) {
        var matchId = "";
        if (userKey < $scope.swipedUser) {
          matchId = userKey + $scope.swipedUser;
        }
        else {
          matchId = $scope.swipedUser + userKey;
        }
        
        // Chceck if this match has somehow been made before
        matchesRef.child(matchId).once('value', function(snapshot) {
          var exists = (snapshot.val() !== null);
          if(!exists) {
              console.log("Creating new match with id: " + matchId);
              newMatchObj = {
                'timeMatched': Firebase.ServerValue.TIMESTAMP,
                'Messages': [{
                  'timestampForIndex':  Firebase.ServerValue.TIMESTAMP,
                  'text': 'He called you a bitch',
                  'userID': 'BRAWLRADMIN'
                }]
              };
              matchesRef.child(matchId).set(newMatchObj);
              usersMatchesRef.child(matchId).set('True');
              otherGuyMatchesRef = fb.child('Users').child($scope.swipedUser).child('Matches');
              otherGuyMatchesRef.child(matchId).set('True');
          }
        });
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
         $state.go('matches', {reload: true});
       } else {
         console.log('You are not ready to talk some shit');
       }
     });
   };


  $scope.cardDestroyed = function(index) {
    $scope.cards.splice(index, 1);
    if ($scope.cards.length < 1) {
        console.log("You ran out of cards!");
        $scope.cards = $scope.doRefresh();
    }
  };

  $scope.showDetails = function(cardIndex) {
  // Disable sluggish animation
  $ionicHistory.nextViewOptions({
    disableAnimate: true,
  });
    $state.go('singleCard', {cardIndex: cardIndex}, {reload: false});
  };

})

.controller('CardCtrl', function($scope, $stateParams, $state, $ionicHistory, Card) {
  
  $scope.detailedCard = Card.getByIndex($stateParams.cardIndex);

  $scope.myGoBack = function() {
      // Disable sluggish animation
      $ionicHistory.nextViewOptions({
          disableAnimate: true,
      });
      $ionicHistory.goBack();
  };

})

// This covers the main match view
.controller('MatchesCtrl', function($scope, $rootScope, $firebaseObject, $state, $ionicHistory, Match) {
  $scope.user = $rootScope.userData;
  $scope.matches = Match.getMatches();
  $scope.matchedUsers = Match.getMatchedUsers();
  $scope.messageList = Match.getMessageList();

  $scope.doRefresh = function() {
    matchesLoading = Match.reloadMatches();
    matchesLoading.then(function(){
      $scope.matches = Match.getMatches();
      $scope.matchedUsers = Match.getMatchedUsers();
      $scope.messageList = Match.getMessageList();
      $scope.$broadcast('scroll.refreshComplete');
    });

  };

  $scope.swipeRight = function() {
      $state.go('cards', {}, {});
  };

  $scope.showMessages = function(matchIndex) {
    // Disable sluggish animation
    $ionicHistory.nextViewOptions({
      disableAnimate: true,
    });
      $state.go('singleMatch', {matchIndex: matchIndex}, {reload: false});
  };

  $scope.showDetails = function(cardIndex) {
    // Disable sluggish animation
    $ionicHistory.nextViewOptions({
      disableAnimate: true,
    });
    $state.go('singleMatchCard', {cardIndex: cardIndex}, {reload: false});
  };


})

// This covers a single match view (i.e. messaging)
.controller('MatchCtrl', function($scope, $stateParams, $state, $ionicHistory, $ionicScrollDelegate, FacebookAuth, Match) {

  $scope.messageArray = Match.getMessageByIndex($stateParams.matchIndex);
  $scope.otherGuy = Match.getUserByMatchIndex($stateParams.matchIndex);

  // Listen for message & scroll down if new one appears
  $scope.messageArray.$watch(function() {
      $ionicScrollDelegate.$getByHandle('small').scrollTop();
  });
  
  setTimeout(function(){ $ionicScrollDelegate.scrollBottom(true); }, 500);
  $scope.myGoBack = function() {
      // Disable sluggish animation
      $ionicHistory.nextViewOptions({
          disableAnimate: true,
      });
      $ionicHistory.goBack();
  };

  $scope.swipeRight = function() {
      $ionicHistory.goBack();
  };

  $scope.sendMessage = function(newMessageText) {
    if (newMessageText === '' || newMessageText === null || newMessageText === undefined) {
      return null;
    }
    var userID = window.localStorage.userKey;

    var d = new Date();
    newMessageTextObject = {
      'time': d,
      'timestampForIndex':  Firebase.ServerValue.TIMESTAMP,
      'text': newMessageText,
      'userID': userID
    };
    $scope.newMessageText = null;
    $scope.messageArray.$add(newMessageTextObject).then(function(ref) {
        console.log("added message with id " + ref.key());
        console.log(JSON.stringify(newMessageTextObject));
        // messageArray.$indexFor(id); // returns location in the array
        // clear message text
      }); 
  };

})

.controller('SingleMatchCardCtrl', function($scope, $stateParams, $state, $ionicHistory, Match) {
  
  $scope.detailedCard = Match.getUserByMatchIndex($stateParams.cardIndex);

  $scope.myGoBack = function() {
      // Disable sluggish animation
      $ionicHistory.nextViewOptions({
          disableAnimate: true,
      });
      $ionicHistory.goBack();
  };

});