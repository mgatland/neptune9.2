//Game code

var random; //eww global.

function Random(seed) {
	console.log("Random seed [" + seed + "]");
	var rng = new Math.seedrandom(seed);
	console.log("Check value: ", rng());
	this.value = function () {
		var temp = rng();
		return temp;
	}
}

function Game() {

	var _this = this;
	var moveIsUsed = false;

	var experienceLevel = 1;
	this.experience = 0;
	this.experienceTarget = 2;

	this.experienceProgress = function () {
		//show a full bar if there are unallocated points
		var unallocatedPoints = false;
		this.players.forEach(function (p) {
			if (p.card.creature.levelUpPoints > 0) unallocatedPoints = true;
			if (p.card.creature.levelUpSkillPoints > 0) unallocatedPoints = true;
		});
		if (unallocatedPoints) {
			return 100;
		}
		return Math.floor(100 * this.experience / this.experienceTarget);
	}

	this.turn = 0;

//attrs: hp, energy, strength, speed, focus
	var weewit = {name:"Weewit", img:"weewit.png", attr:[5, 6, 5, 5, 1]};
	var gobnit = {name:"Gobnit", img:"gobnit.png", attr:[4,  10, 6, 10, 1]};
	var leepig = {name: "Leepig", img: "leepig.png", attr:[6,  5, 8, 7, 10]};
	var dopnot = {name: "Dopnot", img: "dopnot.png", attr:[8,  9, 12, 8, 10]};

  this.cards = [{}, {}, {}, {}];
  this.cards[0].creature = new Creature({name:"Kathee", img:"spy.png", attr:[10, 10, 10, 10, 10], ai: null, team: "good"});
  this.cards[1].creature = new Creature({name:"Imogen", img:"missionary.png", attr:[10, 10, 10, 10, 10], ai: null, team: "good"});
  this.cards[2].creature = new Creature(weewit);
  this.cards[3].creature = new Creature(gobnit);

  this.players = [];
  this.players[0] = new Player({card: this.cards[0], targetNum: 2});
  this.players[1] = new Player({card: this.cards[1], targetNum: 3});

  this.players.forEach(function (p) {
  	p.card.creature.availableSkills = [];
  	p.card.creature.availableSkills.push(superShotMove);
  	p.card.creature.availableSkills.push(healMove);
  	p.card.creature.availableSkills.push(drainMove);
  });

  //let every card know its index.
  for (var i = 0; i < 4; i++) {
  	this.cards[i].num = i;
  }

  var nextTurnMap = {0:2, 2:1, 1:3, 3:0};

  var updateActionOdds = function() {
  	_this.players.forEach(function (player) {
      player.updateActionOdds(_this.cards);
    });
  }

  var spawnCreature = function (num) {
  	var type = (random.value() < 0.5) ? leepig : dopnot;
  	_this.cards[num].creature = new Creature(type);
  }

  var gotAKill = function (attacker, victim) {
	console.log(victim.name + " was killed");
	if (attacker.team === "good" && victim.team !== "good") {
	  _this.experience++;
	  if (random.value() > 0.5) {
        attacker.getPotionHp();
      } else {
        attacker.getPotionEnergy();
      }
	}
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
  	console.log(attacker.name + " used " + action.name + " on " + target.name);
  	action.act(attacker, target, userCard.num, targetNum);
  	if (action.energyCost) {
  		attacker.useEnergy(action.energyCost);
  	}

  	this.cards.forEach(function (card) {
  		var c = card.creature;
  		if (c.justDied === true) {
  			c.justDied = false;
  			gotAKill(attacker, c);
  		}
  	});

    if (this.experience >= this.experienceTarget) {
    	experienceLevel++;
    	this.experience -= this.experienceTarget;
    	this.experienceTarget += 2;
	    this.players.forEach(function (player) {
	      player.card.creature.queueLevelUp(experienceLevel % 2 == 0);
	    });
    }

    return true;
  }  

  this.endTurn = function() {
  	this.turn = nextTurnMap[this.turn];
  	moveIsUsed = false;
  	var creature = this.cards[this.turn].creature;

  	if (creature.isDead()) {
  		creature.deadTime++;
  		if (creature.deadTime == 2 && creature.team !== "good") {
  			//create new creature
  			spawnCreature(this.turn);
  		}
  		moveIsUsed = true;
  		return "skip";
  	} else {
  		creature.recoverEnergy(creature.getMaxEnergy() / 4);
  	}

    updateActionOdds();

  	if (creature.ai != null) {
  		var action = creature.ai(this, this.turn);
  		this.useAction(this.cards[this.turn], action.move, action.target);
  		return "endturn"
  	}
  	return "normal";
  }

  this.moveIsUsed = function () {
  	return moveIsUsed;
  }

  //Start initial turn
  updateActionOdds();
}

function addFx(character, fxName) {
	var fx = {sprite: fxName + ".png"};
	character.fx.push(fx);
	setTimeout(function () {
		var index = character.fx.indexOf(fx);
		character.fx.splice(index, 1);
	}, 400);
}

function makeHitDecider(bonusToHit) {
	return function (user, target) {
  	var chance = bonusToHit + (1 - bonusToHit) * (2 * user.iSpd() / (2 * user.iSpd() + target.iSpd()));
		return Math.min(chance, 1);
	}
}

function Move(options) {
	//configurable parts
	this.name = options.name;
	this.energyCost = options.energyCost;
	var action = options.act;
	var validTargets = options.validTargets;

	if (options.hitChance) {
		this.hitChance = options.hitChance;
	} else {
		this.hitChance = makeHitDecider(options.bonusToHit);
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
				addFx(target, "heal");
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
				addFx(target, "energy");
			}
		}
	}
);

var healMove = new Move(
		{
			name: "Heal",
			validTargets: "friends",
			energyCost: 6,
			act: function(user, target, chance) {
				if (random.value() < chance) {
					target.healAmount(user.iFoc()/2);
					addFx(target, "heal");
				} else {
					addFx(target, "heal-miss");
				}
			},
			hitChance: function(user, target) {
				var chance = (user.iFoc() / (user.iFoc() + 6));
				return Math.min(chance, 1);
			}
		}
	);

var drainMove = new Move(
		{
			name: "Drain",
			energyCost: 6,
			act: function(user, target, chance) {
				if (random.value() < chance) {
					target.useEnergy(user.iFoc());
					addFx(target, "drain");
				} else {
					addFx(target, "drain-miss");
				}
			},
			hitChance: function (user, target) {
				var chance = (user.iFoc() / (user.iFoc() + target.iFoc()));
				return Math.min(chance, 1);
			}
		}
	)

var superShotMove = new Move({
	name:"Super shot!", 
	bonusToHit: 0, 
	energyCost: 9,
	act: function (user, target, chance) {
	if (random.value() < chance) {
		target.hurt(Math.max(user.iStr() / 2, 1));
		target.useEnergy(Math.max(user.iStr() / 4, 1));
		addFx(target, "whack");
	} else {
		addFx(target,"shot-miss");
	}
}});


var normalMoves = [];
normalMoves.push(new Move(
	{
		name:"Shoot",
		bonusToHit: 0.2,
		energyCost: 3,
		act: function (user, target, chance) {
			if (random.value() < chance) {
				target.hurt(Math.max(user.iStr() / 4, 1));
				addFx(target, "shot");
			} else {
				addFx(target, "shot-miss");
			}
		}
	}
	));
normalMoves.push(new Move({name:"Rest", bonusToHit: 1, act: function (user, target) {
	addFx(user, "rest");
}}));

function Player(options) {
	var _this = this;

	for (var attrname in options) {
	 this[attrname] = options[attrname]; 
	};
	var _targetNum = -1;

	this.actionOdds = [];
	this.isLocal = true;

	this.updateActionOdds = function (cards) {
		_this.actionOdds = [];
		var user = _this.card.creature;
		var target = cards[_targetNum].creature;

		cards.forEach(function (card) {
			_this.actionOdds[card.num] = [];
			_this.card.creature.moves.forEach(function (move) {
				var hitChance = move.hitChance(user, card.creature);
				_this.actionOdds[card.num].push(Math.floor(hitChance*100) + "%");
			});
		});			
	}

	this.setTargetNum = function (i) {
		_targetNum = i;
	}

	this.getTargetNum = function () {
		return _targetNum;
	}

	this.levelUpState = function () {
		if (this.card.creature.levelUpPoints > 0) return 1;
		if (this.card.creature.levelUpSkillPoints > 0) return 2;
		return 0;
	}

	//initialize target
	this.setTargetNum(this.targetNum);
	this.targetNum = undefined;
}

var MAXHP = 0;
var MAXENERGY = 1;
var STRENGTH = 2;
var SPEED = 3;
var FOCUS = 4;
var attrNames = ["Hitpoints", "Energy", "Strength", "Speed", "Focus"];

function Creature (options) {
	var c = this;
	this.name = "Name";
	this.team = "evil";
	this.attrNames = attrNames;

	this.potions = {};
	this.potions.hp = 0;
	this.potions.energy = 0;

	this.levelUpPoints = 0;
	this.levelUpSkillPoints = 0;

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
	if (this.attr.length != this.attrNames.length) { //Just a sanity check
		console.error("Wrong number of attr values for " + this.name, this.attr);
	}
	this.hp = this.attr[MAXHP]
	this.energy = this.attr[MAXENERGY];

	this.isDead = function () {
		return this.hp <= 0;
	}

	var energyModifier = function () {
	  if (c.isDead()) return 0;
	  return c.energy / c.attr[MAXENERGY] + 0.5
	};

	this.iStr = function () { return c.attr[STRENGTH] * energyModifier()};
	this.iSpd = function () { return c.attr[SPEED] * energyModifier()};
	this.iFoc = function () { return c.attr[FOCUS] * energyModifier()};

	this.getMaxEnergy = function () {
		return this.attr[MAXENERGY];
	}

	this.getMaxHp = function () {
		return this.attr[MAXHP];
	}

	this.hurt = function (damage) {
		if (this.isDead()) return;
		damage = Math.floor(damage);
		this.hp -= damage;
		if (this.isDead()) {
			this.hp = 0;
			this.energy = 0;
			this.justDied = true;
		}
	}

	this.useEnergy = function (amount) {
		this.energy -= amount;
		if (this.energy < 0) this.energy = 0;
	}

	this.recoverEnergy = function (amount) {
		this.energy += amount;
		if (this.energy > this.attr[MAXENERGY]) this.energy = this.attr[MAXENERGY];
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

	this.healFraction = function(fraction) {
		var amount = fraction * this.attr[MAXHP];
		this.healAmount(amount);
	}

	this.healAmount = function(amount) {
		if (this.isDead()) return;
		this.hp += Math.floor(amount * this.attr[MAXHP]);
		this.hp = Math.min(this.hp, this.attr[MAXHP]);		
	}

	this.restoreEnergyFraction = function(amount) {
		if (this.isDead()) return;
		this.energy += Math.floor(amount * this.attr[MAXENERGY]);
		this.energy = Math.min(this.energy, this.attr[MAXENERGY]);		
	}

	this.isAlive = function () {
		return this.hp > 0;
	}

	this.queueLevelUp = function (giveSkill) {
		if (giveSkill && this.availableSkills.length > 0) {
			this.levelUpSkillPoints += 1;
		} else {
			this.levelUpPoints += 2;
		}
	}

	var fullHeal = function () {
		c.hp = c.getMaxHp();
		c.energy = c.getMaxEnergy();
	}

	this.levelUpAttribute = function(index) {
		if (this.levelUpPoints <= 0) return;
		this.attr[index] += 1;
		this.levelUpPoints--;
		fullHeal();
	}

	this.levelUpSkill = function (index) {
		if (this.levelUpSkillPoints <= 0) return;
		this.levelUpSkillPoints--;
		this.moves.push(this.availableSkills[index]);
		this.availableSkills.splice(index, 1);
		fullHeal();
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
	var switchFunc = function () {return true};

	this.setSwitch = function(func) {
		switchFunc = func;
	}

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
  	if (!switchFunc()) return;
  	actions.forEach(function (actionSet) {
  		var action = actionSet.map[e.keyCode];
  		if (action != null) {
	  		e.preventDefault();
	  		actionSet.callback(action);
	  	}
  	});
  }, false);
};