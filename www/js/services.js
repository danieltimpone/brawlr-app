angular.module('brawlr.services', [])

//  Card Service
//  Defines some variable & helper functions, then returns:
//    -promise: used by $stateProvider (in app.js) to know when cards are done loading
//    -getCards():  method to grab latest cards
//    -getByIndex():  method to grab card by index
//    -getByUserID():  method to grab card by user ID
//    -reloadCards():  method to reload cards (by setting the _cards variable)
.service('Card', function($q, $firebaseArray, $firebaseObject, FacebookAuth) {
  var currentUserID = FacebookAuth.getUserID();
  var _cards = $firebaseArray(fb.child('Users'));

  function shuffle(myArray) {
      var counter = myArray.length, temp, index;
      while (counter > 0) {
          index = Math.floor(Math.random() * counter);
          counter--;
          temp = myArray[counter];
          myArray[counter] = myArray[index];
          myArray[index] = temp;
      }
      return myArray;
  }

  function removeCurrentUser(myCardArray) {
    result = [];
    for (var i = 0; i < myCardArray.length; i++) {
      // Make sure you're not getting yourself
      if (myCardArray[i].$id != currentUserID) {
        result.push(myCardArray[i]);
      }
    }
    return result;
  }

  loadCards = function() {
    return $q(function(resolve, reject) {
        _cards = $firebaseArray(fb.child('Users'));
        _cards.$loaded().then(function(loadedCards){
          cardArrayNoUser = removeCurrentUser(loadedCards);
          _cards = shuffle(cardArrayNoUser);
          console.log('Cards service has loaded');
          resolve();
        });
    });
  };

  return {
    promise: loadCards(),
    getCards: function() {
      return _cards;
    },
    getByIndex: function(cardIndex) {
      return _cards[cardIndex];
    },
    getByUserID: function(userId) {
      for (var i = 0; i < _cards.length; i++) {
        if (_cards[i].$id == userId) {
          _cards[i].ready = true;
          return _cards[i];
        }
      }
    },
    reloadCards: loadCards
  };

})

// This service handles Matches and messaging
.service('Match', function($q, $firebaseObject, $firebaseArray, FacebookAuth) {
  var swipes_ref = fb.child('Swipes');
  var users_ref = fb.child('Users');
  var matches_ref = fb.child('Matches');
  var currentUserID = FacebookAuth.getUserID();

  // We use _matches to get the $ids of other users
  var _matches = $firebaseArray(matches_ref);
  
  // Hold a list of firebaseObjects (One for each match in _matches)
  var _matchedUsers = [];
  
  // Hold a list of firebaseArrays (One for each match in _matches)
  var _messageList = [];

  loadMatches = function() {
    return $q(function(resolve, reject) {
      _matches = $firebaseArray(fb.child('Matches'));
      _matches.$loaded().then(function(loadedMatches){
        for (var i = 0; i < loadedMatches.length; i++){
          otherGuysID = loadedMatches[i].$id.replace(FacebookAuth.getAuthData().facebook.id, '');
          _matchedUsers.push($firebaseObject(users_ref.child(otherGuysID)));
          _messageList.push($firebaseArray(matches_ref.child(loadedMatches[i].$id).child('Messages')));
        }
        console.log("Match service has loaded");
        resolve();
      });
    });
  };

  return {
    promise: loadMatches(),
    getMatches: function() {
      return _matches;
    },
    getMatchedUsers: function() {
      return _matchedUsers;
    },
    getUserByMatchIndex: function(messageIndex) {
      return _matchedUsers[messageIndex];
    },
    getMessageList: function() {
      return _messageList;
    },
    getMessageByIndex: function(messageIndex) {
        return _messageList[messageIndex];
    },
    isMatch: function(swipedUser) {
      return $q(function(resolve, reject) {
        var rightOnCurrent =  $firebaseObject(swipes_ref.child(swipedUser).child(currentUserID).child('swipedRight'));
  
        rightOnCurrent.$loaded().then(function(current) {
          if (current.$value == 'True') {
            resolve(true);
          }
          else {
            resolve(false);
          }
        });
      });
    },
    reloadMatches: loadMatches,
  };

});