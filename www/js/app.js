// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
var app = angular.module('starter', ['ionic', 'ionic.contrib.ui.tinderCards', 'firebase', 'ngCordovaOauth', 'ui.router']);
var fburl = 'https://brawlr.firebaseio.com';
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
            console.log('fuckin with picture 1')
            returnedAuthData.picture = 'http://graph.facebook.com/' + returnedAuthData.facebook.id.replace('facebook:', '') + '/picture?width=600&height=600';
            var userInDatabase = $firebaseObject(fb.child('Users').child('facebook:' + returnedAuthData.facebook.id));

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
                console.log('fuckin with picture 2')
                userObject.picture = 'http://graph.facebook.com/' + returnedAuthData.facebook.id.replace('facebook:', '') + '/picture?width=600&height=600';
                userObject.facebook = returnedAuthData.facebook;
                userObject.expires = returnedAuthData.expires;
                userObject.token = returnedAuthData.token;
                userObject.$save();
                returnedAuthData.isNewUser = false;
              }
            });
            authData = fb.getAuth();
            authData.facebook.id = 'facebook:' + authData.facebook.id;
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
        if (authData.facebook.id.indexOf('facebook:') == - 1) {
          authData.facebook.id = 'facebook:' + authData.facebook.id;
        }
        return authData;
      }
      else {
        authData = fb.getAuth();
        if (authData) {
          if (authData.facebook.id.indexOf('facebook:') == - 1) {
            authData.facebook.id = 'facebook:' + authData.facebook.id;
          }
          return authData;
        }
      }
    }
  };
});

app.controller('LoginCtrl', function($scope, $firebaseObject, $state, $ionicScrollDelegate, FacebookAuth) {
  //  This function will be used to bind the user data to the scope
  function bindToProfile(authData) {
    var ref = fb.child('Users').child(authData.facebook.id);
    var syncedProfile = $firebaseObject(ref);
    syncedProfile.$bindTo($scope, 'user');
  }

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

  // Disable vertical scrolling for first card
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
});

app.service('Message', function($q, $firebaseObject, $firebaseArray) {
  // var matches = $firebaseArray(fb.child('Matches'));

  this.getMessageArray = function(currentUser, otherGuy) {

    return $q(function(resolve, reject) {
        console.log(currentUser);
        console.log(otherGuy);
        if (currentUser < otherGuy) {
          matchId = currentUser + otherGuy;
        }
        else {
          matchId = otherGuy + currentUser;
        }
        console.log("Grabbing match id: " + matchId);
        theseMessages = $firebaseArray(fb.child('Matches').child(matchId).child('Messages').orderByChild("epochTimeForIndex").limitToLast(25));
        resolve(theseMessages);
      });
    };
});

app.service('Match', function($q, $firebaseObject, $firebaseArray) {
  var swipes_ref = fb.child('Swipes');
  var users_ref = fb.child('Users');
  var matches_ref = fb.child('Matches');
  var matches = $firebaseArray(fb.child('Matches'));


  this.isMatch = function(swipedUser, currentUser) {

    return $q(function(resolve, reject) {
      var rightOnCurrent =  $firebaseObject(swipes_ref.child('facebook:'+swipedUser).child(currentUser).child('timestampForIndex'));

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

  _myMatches = null;
  this.myMatchList = function(reload) {
    return $q(function(resolve, reject) {
      reload = reload || false;

      if (!_myMatches || reload) {
        console.log("myMatchList reloading data");
        matches.$loaded().then(function(loadedMatches){
          _myMatches = loadedMatches;
          resolve(loadedMatches);
        });
      }
      else {
        console.log("myMatchList Grabbin old matches");
        resolve(_myMatches);
      }
    });
  };

  _matchedUsers = [];
  this.matchedUsers = function(currentUser, reload) {
    return $q(function(resolve, reject) {
      reload = reload || false;

      // Make sure matches are loaded, then...
      _myMatches.$loaded().then(function(loadedMatches){
        // Go through each match, out otherGuysID, and get his user object
        for (var i = 0; i < loadedMatches.length; i++){
          otherGuysID = loadedMatches[i].$id.replace(currentUser, '');
          _matchedUsers.push($firebaseObject(users_ref.child(otherGuysID)));
        }
        console.log('returnin those matched users');
        resolve(_matchedUsers); 
      });
    });
  };
  this.getUserByMatchIndex = function(messageIndex) {
    if (_matchedUsers) {
        return _matchedUsers[messageIndex];
      }
    return null;
  };


  _messageList = [];
  this.messageList = function(reload) {
    return $q(function(resolve, reject) {
      reload = reload || false;

      // Make sure matches are loaded, then...
      _myMatches.$loaded().then(function(loadedMatches){
        for (var i = 0; i < loadedMatches.length; i++){
          // Go through each match and grab its messages as an array
          _messageList.push($firebaseArray(matches_ref.child(loadedMatches[i].$id).child('Messages')));
        }
        resolve(_messageList); 
      });
    });
  };

  this.getMessageByIndex = function(messageIndex) {
    if (_messageList) {
        return _messageList[messageIndex];
      }
    return null;
  };


});

app.service('Card', function($q, $firebaseArray, $firebaseObject, FacebookAuth) {
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

  _currentProfile = null;
  this.getCurrentUsersProfile = function(userID) {
    return $q(function(resolve, reject) {
      if (_currentProfile !== null) {
        resolve(_currentProfile);
      }
      userAuthObj = FacebookAuth.getAuthData();
      userObj = $firebaseObject(fb.child('Users').child(userAuthObj.facebook.id));
      userObj.$loaded()
        .then(function(loadedProfile) {
          _currentProfile = loadedProfile;
          console.log('returnin current profile');
          resolve(_currentProfile);
      });
    });
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
        var matchId = "";
        if ($scope.user.facebook.id < $scope.swipedUser) {
          matchId = $scope.user.facebook.id + $scope.swipedUser;
        }
        else {
          matchId = $scope.swipedUser + $scope.user.facebook.id;
        }
        
        // Chceck if this match has somehow been made before
        matchesRef.child(matchId).once('value', function(snapshot) {
          var exists = (snapshot.val() !== null);
          if(!exists) {
              console.log("Creating new match with id: " + matchId);
              matchesRef.child(matchId).child('Messages').set({'default': 'He called you a bitch'});
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
         $state.go('matches', {reload: false});
       } else {
         console.log('You are not ready to talk some shit');
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

app.controller('MatchesCtrl', function($scope, $firebaseObject, Match, $state, $ionicHistory, $firebaseArray, FacebookAuth, $q, $ionicGesture, Message) {
  $scope.user = FacebookAuth.getAuthData();

  $scope.doRefresh = function() {
    myMatches = Match.myMatchList();
    myMatches.then(function(resolvedList) {
      $scope.myMatches = resolvedList;
      console.log("myMatches has been loaded. Grabbing matchedUsers now.");
      matchedUsers = Match.matchedUsers($scope.user.facebook.id);
      matchedUsers.then(function(resolvedUsers) {
        $scope.matchedUsers = resolvedUsers;
        console.log("matchedUsers has been loaded. Grabbing messageList now.");
        messageList = Match.messageList();
        messageList.then(function(resolvedMessageList) {
          $scope.messageList = resolvedMessageList;
          console.log("messageList confirmed.");
        });

      });
      $scope.$broadcast('scroll.refreshComplete');
    });
  };

  $scope.doRefresh();

  $scope.swipeRight = function() {
      $state.go('cards', {}, {});
  };
  $scope.showDetails = function(matchIndex) {
    // Disable sluggish animation
    $ionicHistory.nextViewOptions({
      disableAnimate: true,
    });
      $state.go('singleMatch', {matchIndex: matchIndex}, {reload: false});
  };

});

app.controller('MatchCtrl', function($scope, $stateParams, $state, $ionicHistory, $ionicScrollDelegate, FacebookAuth, Match, Card) {
  $scope.textModel = "";
  user = Card.getCurrentUsersProfile();
  user.then(function(loadedUserProfile) {
    $scope.user = loadedUserProfile;
  });
  $scope.messageArray = Match.getMessageByIndex($stateParams.matchIndex);
  $scope.messageArray.$watch(function(event) {
      $ionicScrollDelegate.$getByHandle('small').scrollTop();
  });
  $scope.otherGuy = Match.getUserByMatchIndex($stateParams.matchIndex);
  
  setTimeout(function(){ $ionicScrollDelegate.scrollBottom(true); }, 1000);
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
    var userID = $scope.user.facebook.id;

    var d = new Date();
    newMessageTextObject = {
      'time': d,
      'timestampForIndex':  Firebase.ServerValue.TIMESTAMP,
      'text': newMessageText,
      'userID': userID
    };
    console.log("Adding message: ");
    console.log(JSON.stringify(newMessageTextObject));
    $scope.newMessageText = null;
    $scope.messageArray.$add(newMessageTextObject).then(function(ref) {
        var id = ref.key();
        console.log("added message with id " + id);
        console.log("Message Text: " + newMessageText);
        // messageArray.$indexFor(id); // returns location in the array
        // clear message text
        $scope.newMessageText = "";
      }); 
  };

});

// This is a factory.  It doesn't do shit right now.
app.factory('ProfilePics', function($cordovaOauth, $firebaseAuth, $q, $firebaseObject, FacebookAuth) {
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

app.controller('ProfileCtrl', function($scope, $firebaseObject, $state, $ionicViewSwitcher, $rootScope, Firebase, FacebookAuth, ProfilePics) {
  $scope.status = 'bullcrap';
  $scope.user = FacebookAuth.getAuthData();
  var ref = fb.child('Users').child($scope.user.facebook.id);
  var syncedProfile = $firebaseObject(ref);
  syncedProfile.$bindTo($scope, 'user');

  $scope.logout = function() {
    FacebookAuth.logout();
    $state.go('login', {}, {reload: true, notify: true});
  };

  $scope.swipeLeft = function() {
    // Make sure the animation occurs in the correct direction
    $ionicViewSwitcher.nextDirection('forward');
    // Navigate to cards view
    $state.go('cards', {}, {});
  };

  // This is the code snippet for uploading a new profile pic  
  // angular.element(document.getElementById('upload_pic_one')).on('change',function(e){
  //    var file=e.target.files[0];
  //    angular.element(document.getElementById('upload_pic_one')).val('');
  //    var fileReader=new FileReader();
  //    fileReader.onload=function(event){
  //       fb.child('Users').child($scope.user.facebook.id).child('pic_one').set(event.target.result);
  //       // update_pic_one();
  //       ProfilePics.getPicOne().then(function (data) {
  //         document.getElementById("pic_one").src = data;
  //       });
  //    };
  //    fileReader.readAsDataURL(file);
     
  // });

  // // update_pic_one();
  // ProfilePics.getPic().then(function (data) {
  //   document.getElementById("pic_one").src = data;
  // });
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

app.controller('AppCtrl', function($scope, $ionicPopover, $state, FacebookAuth) {
  $scope.user = FacebookAuth.getAuthData();
  $scope.headerClicked = function () {
    $state.go('cards', {}, {});
  };

});