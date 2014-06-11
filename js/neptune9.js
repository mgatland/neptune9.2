//angular code

angular.module('neptune9', ['ngAnimate'])

.factory('gameService', function($rootScope) {
  var gs = {};

  gs.turn = 0;
  var moveIsUsed = false;

  gs.cards = [{}, {}, {}, {}];
  gs.cards[0].creature = new Creature({name:"Matthew", hp:10, ai: null});
  gs.cards[1].creature = new Creature({name:"Ålice", hp:10, ai: null});
  gs.cards[2].creature = new Creature({name:"Someone", hp:3});
  gs.cards[3].creature = new Creature({name:"Else", hp:4});

  gs.players = [];
  gs.players[0] = new Player({card: gs.cards[0], targetNum: 2});
  gs.players[1] = new Player({card: gs.cards[1], targetNum: 3});

  //let every card know its index.
  for (var i = 0; i < 4; i++) {
  	gs.cards[i].num = i;
  }

  var spawnCreature = function(gs, num) {
  	gs.cards[num].creature = new Creature({name:"Dingbat", hp:3, num:num});
  }

  var nextTurnMap = {0:2, 2:1, 1:3, 3:0};

  var endTurn = function(gs) {
  	gs.turn = nextTurnMap[gs.turn];
  	moveIsUsed = false;
  	var creature = gs.cards[gs.turn].creature;

  	creature.texts.length = 0; //clear messages

  	if (creature.hp <= 0) {
  		creature.deadTime++;
  		if (creature.deadTime == 3) {
  			//create new creature
  			spawnCreature(gs, gs.turn);
  		}
  		gs.skipTurn();
  		$rootScope.$apply();
  		return;
  	} else {
  		creature.recoverEnergy(creature.maxEnergy / 4);
  	}

  	if (creature.ai != null) {
  		var action = creature.ai(gs, gs.turn);
  		gs.useAction(gs.cards[gs.turn], action.move, action.target);
  	}
  	//Otherwise, wait for player input.
  	$rootScope.$apply();
  }

  gs.useAction = function(userCard, actionNum, targetNum) {
  	if (gs.cards[gs.turn] !== userCard) {
  		console.log("Someone tried to act but it's not their turn.");
  		return;
  	}
  	if (moveIsUsed) return;
  	moveIsUsed = true;
  	var attacker = userCard.creature;
  	var action = attacker.moves[actionNum];
  	var target = gs.cards[targetNum].creature;
  	console.log(attacker.name + " used " + action.name + " on " + target.name);
  	var fx = [];
  	action.act(attacker, target, fx, userCard.num, targetNum);

  	fx.forEach(function (e) {
  		var from = coordsForCardNum(e.from);
  		var to = coordsForCardNum(e.to);
  		drawLine(from, to, e.color, e.thickness, e.duration);
  	});
		window.setTimeout(endTurn, 800, gs);
  }

  gs.skipTurn = function() {
  	moveIsUsed = true;
  	window.setTimeout(endTurn, 600, gs);
  }

  return gs;
})
 
.factory('keyboardService', function(gameService) {
	var keyboard = new Keyboard();
	return keyboard;
})

.run(function ($rootScope, gameService) {
	$rootScope.cards = gameService.cards;
	$rootScope.players = gameService.players;
})

.controller('CardCtrl', function($scope, gameService) {
	$scope.card = null;

	$scope.init = function (num) {
		$scope.card = gameService.cards[num];
	}

	$scope.isMyTurn = function () {
		return gameService.turn === $scope.card.num;
	}

	$scope.select = function (index) {
		var player = gameService.players[gameService.turn];
		if (player === undefined) return;
		player.setTarget(index);
	}

	$scope.isActiveTarget = function () {
		var activePlayer = gameService.players[gameService.turn];
		if (activePlayer === undefined) {
			return false;
		}
		return activePlayer.targetNum === $scope.card.num;
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
	$scope.selectedAction = 0;

	var keyCallback = function (key) {
		console.log("Player " + $scope.num + " did " + key);
		$scope.$apply(function () { //called externally, so we must apply
			var actions = $scope.player.card.creature.moves;
			if (key === "left") {
				$scope.player.setTarget(2);
			} else if (key === "right") {
				$scope.player.setTarget(3);
			} else if (key === "down") {
				$scope.selectedAction++;
				if ($scope.selectedAction >= actions.length) $scope.selectedAction = 0;
			} else if (key === "up") {
				$scope.selectedAction--;
				if ($scope.selectedAction < 0 ) $scope.selectedAction = actions.length - 1;
			} else if (key === "use") {
				gameService.useAction($scope.player.card, $scope.selectedAction, $scope.player.targetNum);
			}
		});
	}

	$scope.init = function (num) {
		$scope.num = num;
		$scope.player = gameService.players[num];
		keyboardService.setActions(num, keyCallback);
	}

	$scope.isMyTurn = function () {
		return gameService.turn === $scope.num;
	}

	$scope.useAction = function (index) {
		$scope.selectedAction = index;
		if ($scope.isMyTurn()) {
			gameService.useAction($scope.player.card, index, $scope.player.targetNum);
		}
	}
})
;
