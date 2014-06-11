//Game code

function Game() {
	var _this = this;
	var moveIsUsed = false;

	this.turn = 0;

	var weewit = {name:"Weewit", img:"weewit.png", hp:3, speed: 5, energy: 4};
	var gobnit = {name:"Gobnit", img:"gobnit.png", hp:4, speed: 12, energy: 6};
	var leepig = {name: "Leepig", img: "leepig.png", hp: 6, speed: 15};
	var dopnot = {name: "Dopnot", img: "dopnot.png", hp: 10, speed: 20};

  this.cards = [{}, {}, {}, {}];
  this.cards[0].creature = new Creature({name:"Kathee", img:"spy.png", hp:10, ai: null, team: "good"});
  this.cards[1].creature = new Creature({name:"Imogen", img:"missionary.png", hp:10, ai: null, team: "good"});
  this.cards[2].creature = new Creature(weewit);
  this.cards[3].creature = new Creature(gobnit);

  this.players = [];
  this.players[0] = new Player(this.cards, {card: this.cards[0], targetNum: 2});
  this.players[1] = new Player(this.cards, {card: this.cards[1], targetNum: 3});

  //let every card know its index.
  for (var i = 0; i < 4; i++) {
  	this.cards[i].num = i;
  }

  var nextTurnMap = {0:2, 2:1, 1:3, 3:0};

  var spawnCreature = function(num) {
  	var type = (Math.random() < 0.5) ? leepig : dopnot;
  	_this.cards[num].creature = new Creature(type);
  }

  this.useAction = function(userCard, actionNum, targetNum) {
  	if (this.cards[this.turn] !== userCard) {
  		console.log("Someone tried to act but it's not their turn.");
  		return false;
  	}
  	if (moveIsUsed) return false;
  	moveIsUsed = true;
  	var attacker = userCard.creature;
  	var action = attacker.moves[actionNum];
  	var target = this.cards[targetNum].creature;
    var wasAlive = target.isAlive();
  	console.log(attacker.name + " used " + action.name + " on " + target.name);
  	action.act(attacker, target, userCard.num, targetNum);

    if (target.isAlive() === false && wasAlive === true) {
      console.log("Target was killed");

      if (Math.random() > 0.5) {
        attacker.getPotionHp();
      } else {
        attacker.getPotionEnergy();
      }
    }

    this.players.forEach(function (player) {
      player.updateActionOdds();
    });
    return true;
  }  

  this.endTurn = function() {
  	this.turn = nextTurnMap[this.turn];
  	moveIsUsed = false;
  	var creature = this.cards[this.turn].creature;

  	creature.texts.length = 0; //clear messages

  	if (creature.hp <= 0) {
  		creature.deadTime++;
  		if (creature.deadTime == 3) {
  			//create new creature
  			spawnCreature(this.turn);
  		}
  		moveIsUsed = true;
  		return "skip";
  	} else {
  		creature.recoverEnergy(creature.maxEnergy / 4);
  	}

  	if (creature.ai != null) {
  		var action = creature.ai(this, this.turn);
  		this.useAction(this.cards[this.turn], action.move, action.target);
  		return "endturn"
  	}
  	return "normal";
  }
}

function addFx(character, fxName) {
	var fx = {sprite: fxName + ".png"};
	character.fx.push(fx);
	setTimeout(function () {
		var index = character.fx.indexOf(fx);
		character.fx.splice(index, 1);
	}, 400);
}

function Move(options) {
	//configurable parts
	this.name = options.name;
	var bonusToHit = options.bonusToHit;
	var action = options.act;
	var validTargets = options.validTargets;

	this.hitChance = function(user, target) {
  	var chance = bonusToHit + (1 - bonusToHit) * (2 * user.iSpd() / (2 * user.iSpd() + target.iSpd()));
		return Math.min(chance, 1);
	}

	var fixTarget = function (user, target) {
		if (validTargets === "friends") {
			if (target.team !== user.team) {
				return user;
			}
		}
		return target;
	}

	this.act = function (user, target, userNum, targetNum) {
		target = fixTarget(user, target);
		var chance = this.hitChance(user, target);
		action(user, target, chance, userNum, targetNum);
	}
}

var useHpPotionMove = new Move(
	{
		name:"Health Potion",
		bonusToHit: 1,
		validTargets: "friends",
		act: function (user, target, chance) {
			if (user.usePotionHp()) {
				target.healFraction(0.5);
				addFx(target, "rest");
			}
		}
	}
);

var useEnergyPotionMove = new Move(
	{
		name:"Energy Potion",
		bonusToHit: 1,
		validTargets: "friends",
		act: function (user, target, chance) {
			if (user.usePotionEnergy()) {
				target.restoreEnergyFraction(1);
				addFx(target, "rest");
			}
		}
	}
);


var normalMoves = [];
normalMoves.push(new Move(
	{
		name:"Shoot",
		bonusToHit: 0.5, 
		act: function (user, target, chance) {
			if (Math.random() < chance) {
				target.hurt(Math.max(user.iStr() / 8, 1));
				addFx(target, "shot");
			} else {
				addFx(target, "miss");
			}
			user.useEnergy(3);
		}
	}
	));
normalMoves.push(new Move({name:"Rest", bonusToHit: 1, act: function (user, target) {
	addFx(user, "rest");
	user.texts.push("Rested");
}}));
normalMoves.push(new Move({name:"Whack!", bonusToHit: 0.25, act: function (user, target, chance) {
	if (Math.random() < chance) {
		target.hurt(Math.max(user.iStr() / 4, 1));
		target.useEnergy(Math.max(user.iStr() / 8, 1));
		addFx(target, "whack");
	} else {
		addFx(target,"miss");
	}
	user.useEnergy(8);
}}));
normalMoves.push(new Move({name:"Charge", bonusToHit: 1, act: function (user, target) {
	user.texts.push("Charged!");
	user.name += "!";
}}));

//passing in _cards is a hack so we can update action odds mid-turn
//fixme: only do it once at the end of a turn, called by gameservice,
//pass in the cards then
function Player(_cards, options) {
	var _this = this;

	for (var attrname in options) {
	 this[attrname] = options[attrname]; 
	};
	var _targetNum = -1;

	this.actionOdds = [];


	this.updateActionOdds = function () {
		_this.actionOdds = [];
		var user = _this.card.creature;
		var target = _cards[_targetNum].creature;
		_this.card.creature.moves.forEach(function (move) {
			var hitChance = move.hitChance(user, target);
			_this.actionOdds.push(Math.floor(hitChance*100) + "%");
		});
			
	}

	this.setTargetNum = function (i) {
		_targetNum = i;
		this.updateActionOdds();
	}

	this.getTargetNum = function () {
		return _targetNum;
	}

	//initialize target
	this.setTargetNum(this.targetNum);
	this.targetNum = undefined;
}

function Creature (options) {
	var c = this;
	this.name = "Name";
	this.team = "evil";

	this.hp = 10;
	this.energy = 10;
	this.strength = 10; //attack damage
	this.speed = 10; //hit and dodge
	this.focus = 10; //magic, resist magic

	this.potions = {};
	this.potions.hp = 0;
	this.potions.energy = 0;

	this.texts = [];
	this.fx = [];

	this.moves = [];
	normalMoves.forEach(function (move) {
		c.moves.push(move);
	});

	this.deadTime = 0;
	this.ai = function (game, num) {
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

	this.getPotionHp = function () {
		this.potions.hp++;
		if (this.potions.hp === 1) {
			this.moves.push(useHpPotionMove);
		}
	}

	this.getPotionEnergy = function () {
		this.potions.energy++;
		if (this.potions.energy === 1) {
			this.moves.push(useEnergyPotionMove);
		}
	}

	this.usePotionHp = function () {
		if (this.potions.hp < 1) return false;
		this.potions.hp -= 1;
		if (this.potions.hp < 1) {
			this.moves.splice(this.moves.indexOf(useHpPotionMove), 1);
		}
		return true;
	}

	this.usePotionEnergy = function () {
		if (this.potions.energy < 1) return false;
		this.potions.energy -= 1;
		if (this.potions.energy < 1) {
			this.moves.splice(this.moves.indexOf(useEnergyPotionMove), 1);
		}
		return true;
	}

	this.healFraction = function(amount) {
		if (this.hp <= 0) return;
		this.hp += Math.floor(amount * this.maxHp);
		this.hp = Math.min(this.hp, this.maxHp);
	}

	this.restoreEnergyFraction = function(amount) {
		if (this.hp <= 0) return;
		this.energy += Math.floor(amount * this.maxEnergy);
		this.energy = Math.min(this.energy, this.maxEnergy);		
	}

	this.isAlive = function () {
		return this.hp > 0;
	}
}


// keyboard 

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