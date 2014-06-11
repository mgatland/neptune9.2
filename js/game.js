//Game code

function addFx(character, fxName) {
	var fx = {sprite: fxName + ".png"};
	character.fx.push(fx);
	setTimeout(function () {
		var index = character.fx.indexOf(fx);
		character.fx.splice(index, 1);
	}, 400);
}

function Move(options) {
	for (var attrname in options) {
	 this[attrname] = options[attrname]; 
	};
	this.hitChance = function(user, target) {
		var chance = 0.2 + this.bonusToHit + (1 - this.bonusToHit) * (2 * user.iSpd() / (2 * user.iSpd() + target.iSpd()));
		return Math.min(chance, 1);
	}
}



var normalMoves = [];
normalMoves.push(new Move(
	{
		name:"Shoot",
		bonusToHit: 0.5, 
		act: function (user, target, fx, userNum, targetNum) {
			var chance = this.hitChance(user, target);
			if (Math.random() < chance) {
				target.hurt(Math.max(user.iStr() / 8, 1));
				addFx(target, "shot");
				fx.push({from:userNum, to:targetNum, color:"rgba(255, 0, 0, 0.5)", thickness:6, duration: 500});
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
normalMoves.push(new Move({name:"Whack!", bonusToHit: 0.25, act: function (user, target, fx, userNum, targetNum) {
	var chance = this.hitChance(user, target);
	if (Math.random() < chance) {
		target.hurt(Math.max(user.iStr() / 4, 1));
		target.useEnergy(Math.max(user.iStr() / 8, 1));
		addFx(target, "whack");
		fx.push({from:userNum, to:targetNum, color:"rgba(255, 0, 0, 0.5)", thickness:12, duration: 800});
	} else {
		addFx(target,"miss");
	}
	user.useEnergy(8);
}}));
normalMoves.push(new Move({name:"Charge", bonusToHit: 1, act: function (user, target) {
	user.texts.push("Charged!");
	user.name += "!";
}}));

function Player(options) {
	for (var attrname in options) {
	 this[attrname] = options[attrname]; 
	};

	this.setTarget = function (i) {
		this.targetNum = i;
	}
	//initialize target
	this.setTarget(this.targetNum);
}

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