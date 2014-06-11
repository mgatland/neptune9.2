//angular code

angular.module('neptune9', ['ngAnimate'])

.factory('gameService', function($rootScope) {

  var gs = {};
  var game = new Game();

  gs.turn = 0; //todo: get rid of this, push all code that uses it into game.js

  gs.cards = game.cards;
  gs.players = game.players;

  var queueNextTurn = function(delay) {
    window.setTimeout(endTurn, delay, gs);
  }

  var endTurn = function(gs) {
    console.log("gs.endTurn");
    var result = game.endTurn();
    gs.turn = game.turn;
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
	$scope.num = 0;
	$scope.player = null;
	$scope.selectedAction = 0;

	var keyCallback = function (key) {
		console.log("Player " + $scope.num + " did " + key);
		$scope.$apply(function () { //called externally, so we must apply
			var actions = $scope.player.card.creature.moves;
			if (key === "left") {
				$scope.player.setTargetNum(2);
			} else if (key === "right") {
				$scope.player.setTargetNum(3);
			} else if (key === "down") {
				$scope.selectedAction++;
				if ($scope.selectedAction >= actions.length) $scope.selectedAction = 0;
			} else if (key === "up") {
				$scope.selectedAction--;
				if ($scope.selectedAction < 0 ) $scope.selectedAction = actions.length - 1;
			} else if (key === "use") {
				gameService.useAction($scope.player.card, $scope.selectedAction, $scope.player.getTargetNum());
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
			gameService.useAction($scope.player.card, index, $scope.player.getTargetNum());
		}
	}
})
;
