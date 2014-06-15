var quickDelay = 500;
var skipDelay = 600;
var turnDelay = 800;

//angular code

angular.module('neptune9', ['ngAnimate'])

.factory('netService', function($rootScope) {
	var ns = {};
	var peer = null;
	var id = Math.floor(Math.random()*10000);
	ns.send = null;
	var _connectCallback;
	var _reciever = {};
	_reciever.callback = function () {console.log("PROBLEM: trying to recieve data but there is no callback to call");};

	var setupConn = function (conn) {
		ns.send = function (data) {
			conn.send(data);
			console.log("Sent ", data)
		}

		conn.on('data', function(data) {
  			console.log('Received', data);
  			_reciever.callback(data);
		});
	}

	ns.setCallback = function (callback) {
		_reciever.callback = callback;
	}

	ns.init = function (connectCallback) {
		if (peer !== null) return;
		_connectCallback = connectCallback;
		peer = new Peer(id, {key: 'g9eb986tyyqr529'});

		peer.on('connection', function(conn) {
			console.log("Hosting a game!");
			_connectCallback(true);
			setupConn(conn);
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
.factory('gameService', function($rootScope, netService) {

  var gs = {};
  var game = new Game();
  var isMultiplayer = false;

  gs.turn = 0; //todo: get rid of this, push all code that uses it into game.js
  gs.activePlayer = 0;

  gs.cards = game.cards;
  gs.players = game.players;

  var queueNextTurn = function(delay) {
    window.setTimeout(endTurn, delay, gs);
  }

  var endTurn = function(gs) {
    var result = game.endTurn();
    gs.turn = game.turn;
    if (game.players[gs.turn] != undefined && game.players[gs.turn].isLocal 
    	&& !game.players[gs.turn].card.creature.isDead()) {
    	gs.activePlayer = gs.turn;

    	$rootScope.showLevelUpUI = gs.players[gs.turn].levelUpState();
    }

    if (result === "skip") queueNextTurn(skipDelay);
    if (result === "endturn") queueNextTurn(turnDelay);
  	$rootScope.$apply();
  }

  gs.useAction = function(userCard, actionNum, targetNum, isRemote) {
  	if (!isRemote && isMultiplayer) {
  		netService.send(["useAction", userCard.num, actionNum, targetNum])
  	}
    if (game.useAction(userCard, actionNum, targetNum)) {
      queueNextTurn(turnDelay);
    }
  }

  gs.levelUpSkill = function (player, index, isRemote) {
  	if (!isRemote && isMultiplayer) {
  		netService.send(["levelUpSkill", player.card.num, index]);
  	}
  	player.card.creature.levelUpSkill(index);
  	player.updateActionOdds(gs.cards); //todo: move into Game.levelUpSkill
  }

  gs.levelUpAttribute = function (player, index, isRemote) {
  	if (!isRemote && isMultiplayer) {
  		netService.send(["levelUpAttribute", player.card.num, index]);
  	}
  	player.card.creature.levelUpAttribute(index);
  	player.updateActionOdds(gs.cards); //todo: move into Game.levelUpAttribute
  }

  gs.moveIsUsed = function () {
  	return game.moveIsUsed();
  }

  gs.experienceProgress = function () {
  	return game.experienceProgress();
  }

  gs.getLevel = function () {
  	return game.getLevel();
  }

  gs.setLocalPlayer = function(num) {
  	if (num === 0) {
  		gs.players[1].isLocal = false;
  	} else {
  		gs.players[0].isLocal = false;
  	}
  	gs.activePlayer = num;
  	isMultiplayer = true;
  }

  var networkCallback = function (args) {
  	if (args[0]==="useAction") {
  		var cardNum = args[1];
  		gs.useAction(gs.cards[cardNum], args[2], args[3], true);
  	} else if (args[0]==="levelUpSkill") {
  		var playerNum = args[1];
  		gs.levelUpSkill(gs.players[playerNum], args[2], true);
  	} else if (args[0]==="levelUpAttribute") {
  		var playerNum = args[1];
  		gs.levelUpAttribute(gs.players[playerNum], args[2], true);
  	} else {
  		console.log("Invalid data recieved", args);
  	}
  	$rootScope.$apply();
  }

  netService.setCallback(networkCallback);

  return gs;
})
 
.factory('keyboardService', function() {
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

	$rootScope.isLocalTurn = function () {
		var player = $rootScope.players[gameService.turn];
		if (player && !player.card.creature.isDead()) return player.isLocal;
		return false;
	}

	$rootScope.isGameOver = function () {
		var survivorCount = 0;
		$rootScope.players.forEach(function (p) {
			if (!p.card.creature.isDead()) survivorCount++;
		});
		return survivorCount == 0;
	}

	$rootScope.getLevel = function () {
		return gameService.getLevel();
	}

	preloadImages();
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
		var player = gameService.players[gameService.activePlayer];
		if (player === undefined) return;
		player.setTargetNum(index);
	}

	$scope.isActiveTarget = function () {
		var activePlayer = gameService.players[gameService.activePlayer];
		if (activePlayer === undefined) {
			return false;
		}
		return activePlayer.getTargetNum() === $scope.card.num;
	}

})

.controller('ControlCtrl', function($scope, gameService, keyboardService, $rootScope) {
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
		keyboardService.setSwitch(function () {
			return $rootScope.inGame;
		});
	}

	$scope.useAction = function (index) {
		$scope.selectedAction = index;
		gameService.useAction(player().card, index, player().getTargetNum());
	}

	$scope.energyCostIcon = function (action) {
		var out = "";
		for (var i = 0; i < action.energyCost / 3; i++) {
			out += "•";
		}
		return out;
	}
})

.controller('LevelUpCtrl', function($scope, gameService, $rootScope) {

	var player = function () {
		return gameService.players[gameService.activePlayer];
	}
	$scope.player = player;

	var updateUI = function (delayed) {
		var levelUpState = player().levelUpState();
		if (levelUpState != $rootScope.showLevelUpUI) {
			if (delayed) {
				setTimeout(function () {
					$rootScope.showLevelUpUI = levelUpState;
					$rootScope.$apply();
				}, quickDelay);
			} else {
				$rootScope.showLevelUpUI = levelUpState;
			}

    }
	}

	$scope.levelUpSkill = function (index) {
		gameService.levelUpSkill(player(), index);
		updateUI();
	}

	$scope.levelUpAttribute = function (index) {
		gameService.levelUpAttribute(player(), index);
		updateUI(true);
	}
})

.controller("SetupCtrl", function ($scope, $rootScope, netService, gameService) {
	$scope.screen = "gametype";
	$scope.hostingId = "";
	$scope.joiningId = "";

	var connCallback = function (isHosting) {
		$rootScope.inGame = true;
		gameService.setLocalPlayer(isHosting ? 0 : 1);
		if (isHosting) {
			random = new Random(""+$scope.hostingId);
		} else {
			random = new Random(""+$scope.joiningId);
		}
		$rootScope.$apply();
	}

	var dataCallback = function (data) {
		console.log(data);
	}

	$scope.localMode = function () {
		random = new Random();
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
