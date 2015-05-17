angular.module('brawlr.services', [])

//  Card Service
//  Defines some variable & helper functions, then returns:
//    -promise: used by $stateProvider (in app.js) to know when cards are done loading
//    -getCards():  method to grab latest cards
//    -getByIndex():  method to grab card by index
//    -getByuserKey():  method to grab card by user ID
//    -reloadCards():  method to reload cards (by setting the _cards variable)
.service('Card', function($q, $rootScope, $firebaseArray, $firebaseObject, FacebookAuth) {

  var userKey = window.localStorage.userKey;
  var _cards = $firebaseArray(fb.child('Cards'));

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
      if (myCardArray[i].$id != userKey) {
        result.push(myCardArray[i]);
      }
    }
    return result;
  }

  loadCards = function() {
    return $q(function(resolve, reject) {
        console.log('Cards service loading');
        _cards = $firebaseArray(fb.child('Cards'));
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
    getByuserKey: function(userKey) {
      for (var i = 0; i < _cards.length; i++) {
        if (_cards[i].$id == userKey) {
          _cards[i].ready = true;
          return _cards[i];
        }
      }
    },
    reloadCards: loadCards
  };

})

// This service handles Matches and messaging
.service('Match', function($q, $rootScope, $firebaseObject, $firebaseArray, FacebookAuth) {
  var swipes_ref = fb.child('Swipes');
  var cards_ref = fb.child('Cards');
  var matchesRef = fb.child('Matches');
  var userKey = window.localStorage.userKey;
  var userMatchesRef = fb.child('Users').child(userKey).child('Matches');
  
  var _matches = [];
  // Hold a list of firebaseObjects (One for each match in _matches)
  var _matchedUsers = [];
  
  // Hold a list of firebaseArrays (One for each match in _matches)
  var _messageList = [];

  loadMatches = function() {
    return $q(function(resolve, reject) {
      _matches = [];
      _matchedUsers = [];
      _messageList = [];
      console.log("Matches service loading.");
        userMatchesRef.once('value', function(keyList) {
          keyList.forEach(function(match) {
            thisMatchKey = match.key();
            if (match.val() == 'True') {
              otherGuysID = thisMatchKey.replace(userKey, '');
              _matchedUsers.push($firebaseObject(cards_ref.child(otherGuysID)));
              _messageList.push($firebaseArray(matchesRef.child(thisMatchKey).child('Messages')));
              _matches.push($firebaseObject(matchesRef.child(thisMatchKey)));
              console.log("Found match with key:" + thisMatchKey);
            }
          });
          console.log("Matches service has loaded.");
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
    getMatchIDbyIndex: function(matchIndex) {
        return _matches[matchIndex].$id;
    },
    isMatch: function(swipedUser) {
      return $q(function(resolve, reject) {
        var rightOnCurrent =  $firebaseObject(swipes_ref.child(swipedUser).child(window.localStorage.userKey).child('swipedRight'));
  
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