//angular code

angular.module('neptune9', ['ngAnimate'])

.factory('netService', function($rootScope) {
	var ns = {};
	var peer = null;
	var id = Math.floor(Math.random()*10000);
	ns.send = null;
	var _connectCallback;
	var _recieveCallback;

	var setupConn = function (conn) {
		ns.send = function (data) {
			conn.send(data);
			console.log("Sent ", data)
		}

		conn.on('data', function(data) {
  		console.log('Received', data);
  		_recieveCallback(data);
		});
	}

	ns.init = function (connectCallback, recieveCallback) {
		if (peer !== null) return;
		_connectCallback = connectCallback;
		_recieveCallback = recieveCallback;
		peer = new Peer(id, {key: 'g9eb986tyyqr529'});

		peer.on('connection', function(conn) {
			console.log("Hosting a game!");
			_connectCallback(true);
			setupConn(conn, connectCallback, recieveCallback);
		});
	}

	ns.getId = function () {
		return id;
	}

	ns.join = function (otherId) {
		var conn = peer.connect(otherId);
		conn.on('open', function(){
			console.log("Joined a game!");
			_connectCallback(false);
		});
		setupConn(conn);
	}

	return ns;
})
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
	$rootScope.inGame = false;

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

.controller("SetupCtrl", function ($scope, $rootScope, netService) {
	$scope.screen = "gametype";
	$scope.hostingId = "";
	$scope.joiningId = "";

	var connCallback = function (isHosting) {
		$rootScope.inGame = true;
		$rootScope.$apply();
	}

	var dataCallback = function (data) {
		console.log(data);
	}

	$scope.localMode = function () {
		$rootScope.inGame = true;
	}

	$scope.networkMode = function () {
		$scope.screen = "hostorjoin"
	}
	//network options
	$scope.back = function () {
		$scope.screen = "gametype"
	}
	$scope.hostGame = function () {
		netService.init(connCallback, dataCallback);
		$scope.screen = "hostgame"
		$scope.hostingId = netService.getId();
	}
	$scope.joinGame = function () {
		netService.init(connCallback, dataCallback);
		$scope.screen = "joingame"
	}
	$scope.join = function () {
		netService.join($scope.joiningId);
	}
})
;
