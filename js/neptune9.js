//angular code

angular.module('neptune9', [])

.factory('gameService', function() {
  var gameService = {};
  gameService.creatures = [];
  var normalMoves = ["Attack", "Recover", "Protect", "Charge"];
  gameService.creatures[0] = {name:"Matthew", hp:10, moves: normalMoves};
  gameService.creatures[1] = {name:"Ålice", hp:20, moves: normalMoves};
  gameService.creatures[2] = {name:"Someone", hp:30, moves: normalMoves};
  gameService.creatures[3] = {name:"Else", hp:40, moves: normalMoves};

  gameService.players = [];
  gameService.players[0] = {creature: gameService.creatures[0]};
  gameService.players[1] = {creature: gameService.creatures[1]};

  return gameService;
})
 
.factory('keyboardService', function(gameService) {
	var keyboard = new Keyboard();
	return keyboard;
})

.run(function ($rootScope, gameService) {
	$rootScope.creatures = gameService.creatures;
	$rootScope.players = gameService.players;
})

.controller('CardCtrl', function($scope, gameService) {
	$scope.num = 0;
	$scope.creature = null;

	$scope.init = function (num) {
		$scope.num = num;
		$scope.creature = gameService.creatures[$scope.num];
	}

})

//This lets me inject html like the arrow key codes
.filter('unsafe', function($sce) {
    return function(val) {
        return $sce.trustAsHtml(val);
    };
})

.controller('ControlCtrl', function($scope, gameService, keyboardService) {
	var keys = [];
	keys[0] = ['w', 's', 'a', 'd'];
	keys[1] = ['&#8593;', '&#8595;', '&#8592;', '&#8594;'];
	$scope.num = 0;
	$scope.player = null;
	$scope.actions = [];
	$scope.targetNum = 0;

	var keyboardAction = function (key) {
		console.log("Player " + $scope.num + " did " + key)
	}

	$scope.init = function (num) {
		$scope.num = num;
		$scope.targetNum = num + 2;
		$scope.player = gameService.players[num];
		$scope.updateActions();
		keyboardService.setActions(num, keyboardAction);
	}

	$scope.updateActions = function () {
		var c = $scope.player.creature;
		var num = $scope.num;
		var actions = [];
		c.moves.forEach(function (v, i) {
			actions.push({key: keys[num][i], move: c.moves[i]})
		});
		$scope.actions = actions;
	}

	$scope.useAction = function (action) {
		console.log("Using action " + action.move);
	}

})

;


// non-angular code

if (typeof KeyEvent == "undefined") {
    var KeyEvent = {
        DOM_VK_LEFT: 37,
        DOM_VK_UP: 38,
        DOM_VK_RIGHT: 39,
        DOM_VK_DOWN: 40,

        DOM_VK_W: 87,
        DOM_VK_A: 65,
        DOM_VK_S: 83,
        DOM_VK_D: 68,

        DOM_VK_ENTER: 14,
        DOM_VK_RETURN: 13
    }
};

var Keyboard = function () {
	var actions = [];
	console.log("New Keyboard");

	this.setActions = function(i, callback) {
		var newActions = [];
		if (i == 0) {
		  newActions[KeyEvent.DOM_VK_W] = "up";
		  newActions[KeyEvent.DOM_VK_A] = "left";
		  newActions[KeyEvent.DOM_VK_S] = "down";
		  newActions[KeyEvent.DOM_VK_D] = "right";
		} else if (i == 1) {
			newActions[KeyEvent.DOM_VK_LEFT] = "left";
		  newActions[KeyEvent.DOM_VK_UP] = "up";
		  newActions[KeyEvent.DOM_VK_RIGHT] = "right";
		  newActions[KeyEvent.DOM_VK_DOWN] = "down";
		}
		actions[i] = {map: newActions, callback: callback}
	}

  window.addEventListener("keydown", function (e) {
  	actions.forEach(function (actionSet) {
  		var action = actionSet.map[e.keyCode];
  		if (action != null) {
	  		e.preventDefault();
	  		actionSet.callback(action);
	  	}
  	});
  }, false);
};