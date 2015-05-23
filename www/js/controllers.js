angular.module('brawlr.controllers', [])

 // AppCtrl is the parent to all other Controllers (see: index.html)
 // We use app control to set the root variables for the user's id/profile
.controller('AppCtrl', function($scope, $rootScope, $state, $firebaseObject, FacebookAuth) {
  if ($rootScope.userKey && $rootScope.userData && fb.getAuth()) {
    loadingProfile = $firebaseObject(fb.child('Cards').child(window.localStorage.userKey));
    loadingProfile.$bindTo($rootScope, "userProfile").then(function() {
      console.log("AppCtrl has binded userProfile to $scope.userProfile"); // { foo: "bar" }
    });    
  }
  else {
    $state.go('login', {}, {reload: true});    
  }

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
      loadingProfile = $firebaseObject(fb.child('Cards').child(window.localStorage.userKey));
      loadingProfile.$bindTo($rootScope, "userProfile").then(function() {
        console.log("Login has binded userProfile to $scope.userProfile"); // { foo: "bar" }
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
    if (_index == 1 || _index == 3) {
      $scope.showLeftArrow = true;
      $scope.showRightArrow = true;
      $ionicScrollDelegate.getScrollView().options.scrollingY = false;
    }
    if (_index == 4) {
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
        
        // Make sure this fucker is new
        matchesRef.child(matchId).once('value', function(snapshot) {
          var exists = (snapshot.val() !== null);
          if(!exists) {
              console.log("Creating new match with id: " + matchId);
              newMatchObj = {
                'timeMatched': Firebase.ServerValue.TIMESTAMP,
                'Messages': [{
                  'timestampForIndex':  Firebase.ServerValue.TIMESTAMP,
                  'text': 'He called you a bitch',
                  'userKey': 'BRAWLRADMIN'
                }]
              };
              // Set intro message in brand-new match object
              matchesRef.child(matchId).set(newMatchObj);
              // (Users/$UID/Matches/$MatchID)
              usersMatchesRef.child(matchId).set('True');
              // (Users/$UID/Matches/$MatchID)
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
         $state.go('matches', {forceReload: "True"}, {reload: true});
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
.controller('MatchesCtrl', function($scope, $rootScope, $stateParams, $firebaseObject, $state, $ionicHistory, Match) {
  $scope.$on('$stateChangeSuccess', 
    function(event, toState, toParams, fromState, fromParams){
    if (toState.name == 'matches' && toParams.forceReload) {
      console.log("MatchesCtrl saw forceReload");
      $scope.doRefresh();
    }
  });
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
.controller('MatchCtrl', function($scope, $rootScope, $stateParams, $state, $ionicHistory, $ionicScrollDelegate, $ionicPopover, $ionicPopup, FacebookAuth, Match) {

  setTimeout(function(){ $ionicScrollDelegate.scrollBottom(true); }, 500);
  matchId = Match.getMatchIDbyIndex($stateParams.matchIndex);
  console.log($stateParams.matchIndex);
  console.log("Grabbed id:");
  console.log(matchId);
  $scope.messageArray = Match.getMessageByIndex($stateParams.matchIndex);
  $scope.otherGuy = Match.getUserByMatchIndex($stateParams.matchIndex);

  // Listen for message & scroll down if new one appears
  $scope.messageArray.$watch(function() {
      $ionicScrollDelegate.$getByHandle('small').scrollTop();
  });
  var matchesRef = fb.child('Matches');
  var usersMatchesRef = fb.child('Users').child($rootScope.userKey).child('Matches');
  
  $scope.reportUser = function() {
    var confirmReportPopup = $ionicPopup.confirm({
      title: "Report User",
      template: 'Are you sure you want to report this user?'
    });
    confirmReportPopup.then(function(res) {
      if(res) {
        // Set Match as flagged in your own User Row.   (Users/$UID/Matches/$MatchID)
        fb.child('Users').child($rootScope.userKey).child('Matches').child(matchId).set('Flagged');
        // Set Match as false in their User Row.        (Users/$UID/Matches/$MatchID)
        fb.child('Users').child($scope.otherGuy.$id).child('Matches').child(matchId).set('False');

        matchesLoading = Match.reloadMatches();
        matchesLoading.then(function(){
          var reportedAlertPopup = $ionicPopup.alert({
            title: "User Reported",
            template: "We are very sorry they were a jerk!  We will investigate into the matter"
          });
          reportedAlertPopup.then(function() {
            $state.go('matches', {forceReload: "True"}, {reload: true});
          });
        });
      } else {
       console.log('ReportUser cancelled');
      }
    });
  };

  $scope.destroyMatch = function() {
    var confirmReportPopup = $ionicPopup.confirm({
      title: "Destroy Match",
      template: 'Are you sure you want to destroy this match? You may never be able to match with this user again!'
    });
    confirmReportPopup.then(function(res) {
      if(res) {
        // Set Match as false in your own User Row.   (Users/$UID/Matches/$MatchID)
        fb.child('Users').child($rootScope.userKey).child('Matches').child(matchId).set('False');
        // Set Match as false in their User Row.        (Users/$UID/Matches/$MatchID)
        fb.child('Users').child($scope.otherGuy.$id).child('Matches').child(matchId).set('False');

        matchesLoading = Match.reloadMatches();
        matchesLoading.then(function(){
          $state.go('matches', {forceReload: "True"}, {reload: true});
        });
      }
   });
  };

  $scope.sendMessage = function(newMessageText) {
    if (newMessageText === '' || newMessageText === null || newMessageText === undefined) {
      return null;
    }
    var userKey = window.localStorage.userKey;

    var d = new Date();
    newMessageTextObject = {
      'time': d,
      'timestampForIndex':  Firebase.ServerValue.TIMESTAMP,
      'text': newMessageText,
      'userKey': userKey
    };
    $scope.newMessageText = null;
    $scope.messageArray.$add(newMessageTextObject).then(function(ref) {
        console.log("added message with id " + ref.key());
        console.log(JSON.stringify(newMessageTextObject));
        // messageArray.$indexFor(id); // returns location in the array
        // clear message text
      }); 
  };

  // Load popover front template, then initialize its shit.
  $ionicPopover.fromTemplateUrl('templates/matches.popover.html', {
    scope: $scope
  }).then(function(popover) {
    console.log("poopover loaded");
    $scope.popover = popover;
    $scope.openPopover = function($event) {
        console.log("Opening popover");
        $scope.popover.show($event);
        console.log("Opened popover");
      };
      $scope.closePopover = function() {
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
  }).catch(function(err) {
    console.log("Err is:");
    console.log(JSON.stringify(err));


  
  });


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
