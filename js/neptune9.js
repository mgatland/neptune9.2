//Game code

var normalMoves = [];
normalMoves.push({name:"Attack", act: function (user, target) {
	target.hp -= 1;
}});
normalMoves.push({name:"Recover", act: function (user, target) {
	user.hp += 1;
}});
normalMoves.push({name:"Protect", act: function (user, target) {
	user.hp += 1;
}});
normalMoves.push({name:"Charge", act: function (user, target) {
	user.name += "!";
}});

function Creature (options) {
	this.name = "Name";
	this.hp = 10;
	this.moves = normalMoves;
	this.ai = function (gs) {
		return {move: 0, target: (this.num + 2) % 4};
	};

	for (var attrname in options) {
	 this[attrname] = options[attrname]; 
	};
}

//angular code

angular.module('neptune9', [])

.factory('gameService', function($rootScope) {
  var gs = {};

  gs.turn = 0;
  var moveIsUsed = false;

  gs.creatures = [];
  gs.creatures[0] = new Creature({name:"Matthew", hp:10, ai: null});
  gs.creatures[1] = new Creature({name:"Ålice", hp:20, ai: null});
  gs.creatures[2] = new Creature({name:"Someone", hp:30});
  gs.creatures[3] = new Creature({name:"Else", hp:40});

  gs.players = [];
  gs.players[0] = {creature: gs.creatures[0]};
  gs.players[1] = {creature: gs.creatures[1]};

  //let every creature know its index.
  for (var i = 0; i < 4; i++) {
  	gs.creatures[i].num = i;
  }

  var endTurn = function(gs) {
  	gs.turn++;
  	if (gs.turn >= 4) gs.turn = 0;
  	moveIsUsed = false;
  	var creature = gs.creatures[gs.turn];
  	if (creature.ai != null) {
  		var action = creature.ai(gs);
  		gs.useAction(creature, action.move, action.target);
  	}
  	$rootScope.$apply();
  }

  gs.useAction = function(user, actionNum, targetNum) {
  	if (gs.creatures[gs.turn] !== user) {
  		console.log("Someone tried to act but it's not their turn.");
  		return;
  	}
  	if (moveIsUsed) return;
  	moveIsUsed = true;
  	var action = user.moves[actionNum];
  	var target = gs.creatures[targetNum];
  	console.log(user.name + " used " + action.name + " on " + target.name);
  	action.act(user, target);

		window.setTimeout(endTurn, 1000, gs);
  }

  return gs;
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

	$scope.isMyTurn = function () {
		return gameService.turn === $scope.num;
	}

})

//This lets me inject html like the arrow key codes
.filter('unsafe', function($sce) {
    return function(val) {
        return $sce.trustAsHtml(val);
    };
})

.controller('ControlCtrl', function($scope, gameService, keyboardService) {
//	keys[0] = ['w', 's', 'a', 'd'];
//	keys[1] = ['&#8593;', '&#8595;', '&#8592;', '&#8594;'];
	$scope.num = 0;
	$scope.player = null;
	$scope.targetNum = 0;
	$scope.targetName = "--";
	$scope.selectedAction = 0;

	var keyCallback = function (key) {
		console.log("Player " + $scope.num + " did " + key);
		$scope.$apply(function () { //called externally, so we must apply
			var actions = $scope.player.creature.moves;
			if (key === "left") {
				$scope.targetNum = 2;
			} else if (key === "right") {
				$scope.targetNum = 3;
			} else if (key === "down") {
				$scope.selectedAction++;
				if ($scope.selectedAction >= actions.length) $scope.selectedAction = 0;
			} else if (key === "up") {
				$scope.selectedAction--;
				if ($scope.selectedAction < 0 ) $scope.selectedAction = actions.length - 1;
			} else if (key === "use") {
				gameService.useAction($scope.player.creature, $scope.selectedAction, $scope.targetNum);
			}
			$scope.targetName = gameService.creatures[$scope.targetNum].name;	
		});
	}

	$scope.init = function (num) {
		$scope.num = num;
		$scope.targetNum = num + 2;
		$scope.targetName = gameService.creatures[$scope.targetNum].name;	
		$scope.player = gameService.players[num];
		keyboardService.setActions(num, keyCallback);
	}

	$scope.isMyTurn = function () {
		return gameService.turn === $scope.num;
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

        DOM_VK_E: 69,

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
		  newActions[KeyEvent.DOM_VK_E] = "use";
		} else if (i == 1) {
			newActions[KeyEvent.DOM_VK_LEFT] = "left";
		  newActions[KeyEvent.DOM_VK_UP] = "up";
		  newActions[KeyEvent.DOM_VK_RIGHT] = "right";
		  newActions[KeyEvent.DOM_VK_DOWN] = "down";
		  newActions[KeyEvent.DOM_VK_ENTER] = "use";
		  newActions[KeyEvent.DOM_VK_RETURN] = "use";
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