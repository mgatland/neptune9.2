//angular code

angular.module('neptune9', ['ngAnimate'])

.factory('gameService', function($rootScope) {

  var gs = {};
  var game = new Game();

  gs.turn = 0; //todo: get rid of this, push all code that uses it into game.js
  gs.activePlayer = 0;

  gs.cards = game.cards;
  gs.players = game.players;

  var queueNextTurn = function(delay) {
    window.setTimeout(endTurn, delay, gs);
  }

  var endTurn = function(gs) {
    console.log("gs.endTurn");
    var result = game.endTurn();
    gs.turn = game.turn;
    if (game.players[gs.turn] != undefined) {
    	gs.activePlayer = gs.turn;

    	$rootScope.showLevelUpUI = gs.players[gs.turn].levelUpState();
    }



    if (result === "skip") queueNextTurn(600);
    if (result === "endturn") queueNextTurn(800);
  	$rootScope.$apply();
  }

  gs.useAction = function(userCard, actionNum, targetNum) {
    console.log("gs.useAction");
    if (game.useAction(userCard, actionNum, targetNum)) {
      queueNextTurn(800);
    }
  }

  gs.moveIsUsed = function () {
  	return game.moveIsUsed();
  }

  gs.experienceProgress = function () {
  	return game.experienceProgress();
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
	$rootScope.experienceProgress = gameService.experienceProgress;
	$rootScope.showLevelUpUI = 0;

	$rootScope.turn = function () {
		return gameService.turn;
	}
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
		player.setTargetNum(index);
	}

	$scope.isActiveTarget = function () {
		var activePlayer = gameService.players[gameService.turn];
		if (activePlayer === undefined) {
			return false;
		}
		return activePlayer.getTargetNum() === $scope.card.num;
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
	$scope.selectedAction = 0;

	var keyCallback = function (key) {
		$scope.$apply(function () { //called externally, so we must apply
			var actions = player().card.creature.moves;

			//If the action list shrank, we might be off the end of the list, so:
			if ($scope.selectedAction >= actions.length) $scope.selectedAction = 0;

			if (key === "left") {
				player().setTargetNum(2);
			} else if (key === "right") {
				player().setTargetNum(3);
			} else if (key === "down") {
				$scope.selectedAction++;
				if ($scope.selectedAction >= actions.length) $scope.selectedAction = 0;
			} else if (key === "up") {
				$scope.selectedAction--;
				if ($scope.selectedAction < 0 ) $scope.selectedAction = actions.length - 1;
			} else if (key === "use") {
				gameService.useAction(player().card, $scope.selectedAction, player().getTargetNum());
			}
		});
	}

	var player = function () {
		return gameService.players[gameService.activePlayer];
	}
	$scope.player = player;

	$scope.init = function () {
		keyboardService.setActions(0, keyCallback);
		keyboardService.setActions(1, keyCallback);
	}

	$scope.useAction = function (index) {
		$scope.selectedAction = index;
		gameService.useAction(player().card, index, player().getTargetNum());
	}
})

.controller('LevelUpCtrl', function($scope, gameService, $rootScope) {

	var player = function () {
		return gameService.players[gameService.activePlayer];
	}
	$scope.player = player;

	var updateUI = function () {
		var levelUpState = player().levelUpState();
		if (levelUpState != $rootScope.showLevelUpUI) {
			setTimeout(function () {
				$rootScope.showLevelUpUI = levelUpState;
				$rootScope.$apply();
			}, 500);
    }
	}

	$scope.levelUpSkill = function (index) {
		player().card.creature.levelUpSkill(index);
		updateUI();
	}

	$scope.levelUpAttribute = function (index) {
		player().card.creature.levelUpAttribute(index);
		updateUI();
	}
})
;
