//Game code

function addFx(character, fxName) {
	var fx = {sprite: fxName + ".png"};
	character.fx.push(fx);
	setTimeout(function () {
		var index = character.fx.indexOf(fx);
		character.fx.splice(index, 1);
	}, 400);
}

var normalMoves = [];
normalMoves.push({name:"Shoot", act: function (user, target, fx, userNum, targetNum) {
	var hitChance = 0.5 + 0.5 * (user.iSpd() / (user.iSpd() + target.iSpd()));
	if (Math.random() < hitChance) {
		target.hurt(Math.max(user.iStr() / 8, 1));
		addFx(target, "shot");
		fx.push({from:userNum, to:targetNum, color:"rgba(255, 0, 0, 0.5)", thickness:6, duration: 500});
	} else {
		addFx(target, "miss");
	}
	user.useEnergy(3);
}});
normalMoves.push({name:"Rest", act: function (user, target) {
	addFx(user, "rest");
	user.texts.push("Rested");
}});
normalMoves.push({name:"Whack!", act: function (user, target, fx, userNum, targetNum) {
	var hitChance = 1 * (user.iSpd() * 3 / (user.iSpd() * 3 + target.iSpd()));
	if (Math.random() < hitChance) {
		target.hurt(Math.max(user.iStr() / 4, 1));
		target.useEnergy(Math.max(user.iStr() / 8, 1));
		addFx(target, "whack");
		fx.push({from:userNum, to:targetNum, color:"rgba(255, 0, 0, 0.5)", thickness:12, duration: 800});
	} else {
		addFx(target,"miss");
	}
	user.useEnergy(8);
}});
normalMoves.push({name:"Charge", act: function (user, target) {
	user.texts.push("Charged!");
	user.name += "!";
}});

function Creature (options) {
	var c = this;
	this.name = "Name";

	this.hp = 10;
	this.energy = 10;
	this.strength = 10; //attack damage
	this.speed = 10; //hit and dodge
	this.focus = 10; //magic, resist magic

	this.texts = [];
	this.fx = [];

	this.moves = normalMoves;
	this.deadTime = 0;
	this.ai = function (gs, num) {
		return {move: 0, target: (num + 2) % 4};
	};

	for (var attrname in options) {
	 this[attrname] = options[attrname]; 
	};
	this.maxHp = this.hp;
	this.maxEnergy = this.energy;

	var energyModifier = function () { return c.energy / c.maxEnergy + 0.5};

	this.iStr = function () { return c.strength * energyModifier()};
	this.iSpd = function () { return c.speed * energyModifier()};
	this.iFoc = function () { return c.focus * energyModifier()};

	this.hurt = function (damage) {
		damage = Math.floor(damage);
		this.hp -= damage;
		if (this.hp < 0) this.hp = 0;
	}

	this.useEnergy = function (amount) {
		amount = Math.floor(amount);
		this.energy -= amount;
		if (this.energy < 0) this.energy = 0;
	}

	this.recoverEnergy = function (amount) {
		amount = Math.floor(amount);
		this.energy += amount;
		if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
	}
}

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
  gs.players[0] = {card: gs.cards[0], targetNum: 2};
  gs.players[1] = {card: gs.cards[1], targetNum: 3};

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
		player.targetNum = index;
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
				$scope.player.targetNum = 2;
			} else if (key === "right") {
				$scope.player.targetNum = 3;
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