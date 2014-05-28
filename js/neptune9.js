angular.module('neptune9', [])

.factory('gameService', function($rootScope, $http) {
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
 
.run(function ($rootScope, gameService) {
	$rootScope.creatures = gameService.creatures;
	$rootScope.players = gameService.players;
})

.controller('CardCtrl', function($scope, gameService) {
	$scope.num = 0;
	$scope.creature = null;;

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

.controller('ControlCtrl', function($scope, gameService) {
	var keys = [];
	keys[0] = ['w', 's', 'a', 'd'];
	keys[1] = ['&#8593;', '&#8595;', '&#8592;', '&#8594;'];
	$scope.num = 0;
	$scope.player = null;
	$scope.actions = [];

	$scope.init = function (num) {
		$scope.num = num;
		$scope.player = gameService.players[num];
		$scope.updateActions();
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

})

;
