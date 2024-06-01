////  Page-scoped globals  ////

// Counters
var rocketIdx = 1;
var asteroidIdx = 1;
var shieldIdx = 1;
var asteroidCounter = 0; // This will be the counter for spawning an asteroid
// Accuracy rate Counters
var rocketsFired = 0;
var asteroidsDestroyed = 0;
// Life index for keeping track of lives
// Two lives (0 and 1)
var lifeIndex = 1;

// Item drop Rate (10 should be default)
var dropRate = 10;

// Boolean for checking shields
var shielded = false;

// Boolean for checking if muted
var muted = true;

// Boolean for checking if spaceBar is pressed
var shootPressed = false;

// Size Constants
var MAX_ASTEROID_SIZE = 50;
var MIN_ASTEROID_SIZE = 15;
var ASTEROID_SPEED = 5;
var ROCKET_SPEED = 10;
var SHIP_SPEED = 25;
var OBJECT_REFRESH_RATE = 50;  //ms
var SCORE_UNIT = 100;  // scoring is in 100-point units

// Size vars
var maxShipPosX, maxShipPosY;

// Global Window Handles (gwh__)
var gwhGame, gwhOver, gwhStatus, gwhScore, gwhRate, gwhSplashScreen;
var gwhSettingsPanel, gwhSettingsPanelButton, gwhOverScore, muteButton; // Added gwhRate for accuracy rate

// Global Object Handles
var ship, spSpawnRateInput, spUpdate, startGameButton, backButton, asteroidSpawning, explosion;

/*
 * This is a handy little container trick: use objects as constants to collect
 * vals for easier (and more understandable) reference to later.
 */
var KEYS = {
  left: 37,
  up: 38,
  right: 39,
  down: 40,
  shift: 16,
  spacebar: 32
}

// Set of states available to our game
var STATES = {
    initial: 0,
    running: 1,
    gameover: 2
}

// The state of the game
// STATES container determines this
var state = 0;

// Asteroid Spawn Frequency global
var spawnFrequency = 1;

// Audio
var gameOverAudio;
var introAudio;
var explosionAudio;
var rocketAudio;
var asteroidAudio;
var shieldActivatedAudio;
var shieldDeflectAudio;

////  Functional Code  ////

// Main
$(document).ready( function() {
  console.log("Ready!");

  // Set global handles (now that the page is loaded)
  gwhGame = $('.game-window');
  gwhOver = $('.game-over');
  gwhOverScore = $('#game-over-score');
  gwhStatus = $('.status-window');
  gwhScore = $('#score-box');
  gwhRate = $('#rate-box'); // Accuracy rate html box
  gwhSettingsPanelButton = $('#settings-panel-button'); // Settings panel button
  gwhSettingsPanel = $('.settings-panel'); // actual settings panel
  gwhSplashScreen = $('.splash-screen'); // splash screen

  spSpawnRateInput = $('#spawn-rate-input'); // spawn rate input field (settings panel)
  spUpdate = $('#update-button'); // update button (settings panel)
  muteButton = $('#mute-checkbox'); // mute button (settings panel, default muted)

  startGameButton = $('#start-game-button'); // button for starting the game (splash screen)

  backButton = $('#back-button');

  ship = $('#enterprise');  // set the global ship handle

  explosion = $('.explosion-avatar'); // global explosion handle

  shield = $('.shield-avatar'); // global shield (on ship) handle

  // Set global positions
  maxShipPosX = gwhGame.width() - ship.width();
  maxShipPosY = gwhGame.height() - ship.height();

  // Load Audio
  gameOverAudio = new Audio('audio/gameover.wav');
  explosionAudio = new Audio('audio/spacegame explosion 01.wav');
  rocketAudio = new Audio('audio/spacegame blast 04.wav');
  introAudio = new Audio('audio/intro.mp3');
  introAudio.pause();
  asteroidAudio = new Audio('audio/spacegame rock boom small 01.wav'); // https://freesound.org/people/ProjectsU012/sounds/341626/
  shieldActivatedAudio = new Audio('audio/shieldActivated.wav'); // https://freesound.org/people/runningmind/sounds/363172/
  shieldDeflectAudio = new Audio('audio/shieldDeflect.wav'); // https://freesound.org/people/nekoninja/sounds/370203/

  // Load Audio Channels
  Sound.init();

  // We set the game to the initial state on startup
  state = STATES.initial;

  $(window).keydown(keydownRouter);

  $(window).keyup(keyupRouter);

  // Periodically check for collisions (instead of checking every position-update)
  // Also check for audio signals
  setInterval( function() {
    checkCollisions();  // Remove elements if there are collisions
  }, 100);

  // Settings Panel Button click event
  gwhSettingsPanelButton.click(spButtonHandler);

  // Update Button Click Event
  spUpdate.click(spUpdateHandler);

  // Start Button Click Event
  startGameButton.click(startGameButtonHandler);

  // Back Button Click Event
  backButton.click(backButtonHandler);

});



// An Audio Channel
function channel(audio){
  this.audio = audio;
  this.resource = new Audio(audio);

  channel.prototype.play = function() {
    this.resource.play();
  }
}

// An Audio Channel Handler
function channelHandler(audio, num){
  this.channels = [];
  this.num = num;
  this.index = 0;

  for(var i = 0; i < num; i++){
    this.channels.push(new channel(audio));
  }

  channelHandler.prototype.play = function() {
    this.channels[this.index++].play();
    this.index = this.index < this.num ? this.index  : 0;
  }
}




// Handle pressing Open/Close Settings Panel Button
function spButtonHandler(){
    if(gwhSettingsPanelButton.text() === "Open Settings Panel"){
        // Change text in button
        gwhSettingsPanelButton.html("Close Settings Panel");
        // Show Settings Panel
        gwhSettingsPanel.show();
    }
    else{
        // Change text in button
        gwhSettingsPanelButton.html("Open Settings Panel");
        // Hide Settings Panel
        gwhSettingsPanel.hide();
    }
}

// Handle pressing update
function spUpdateHandler(){
    let shouldUpdate = true;
    if(muteButton.prop('checked')){
        introAudio.pause();
        gameOverAudio.pause();
        rocketAudio.pause();
        explosionAudio.pause();
        asteroidAudio.pause();
        shieldActivatedAudio.pause();
        muted = true;
    }
    else{
        muted = false;
        if(state == STATES.initial){
            introAudio.currentTime = 0;
            introAudio.play();
        }
        if(state == STATES.gameover){
            gameOverAudio.currentTime = 0;
            gameOverAudio.play();
        }
    }
    if(spSpawnRateInput.val() < 0.2 || spSpawnRateInput.val() > 4){
        if(spSpawnRateInput.val()){
            alert("Please enter a numerical value that is between 0.2 and 4");
            console.log("Invalid Spawn Rate Input!");
            shouldUpdate = false;
        }
        else{
            spawnFrequency = 1;
        }
    }
    else{
       spawnFrequency = spSpawnRateInput.val();
       //console.log(spawnFrequency);
       if(state == STATES.running){
           clearInterval(asteroidSpawning);
           asteroidSpawner();
       }
       spSpawnRateInput.val(null);
    }
    if(shouldUpdate){ spButtonHandler(); }
}

// Handle pressing start button
function startGameButtonHandler(){
    // hide the splash screen
    gwhSplashScreen.hide();
    // switch state to running
    state = STATES.running;
    // give the player lives
    giveLives();
    // start spawning asteroids
    asteroidSpawner();
    // pause intro audio when game starts
    introAudio.pause();
}

// Handle pressing the back button
function backButtonHandler(){
    state = STATES.initial;
    gwhOver.hide();
    gwhSplashScreen.show();
    gwhGame.show();
    // Reset game objects
    clearInterval(asteroidSpawning);
    ship.css('top', 530+"px");
    ship.css('left', 122+"px");
    // Reset Statistics
    score = 0;
    rocketsFired = 0;
    asteroidsDestroyed = 0;
    asteroidCounter = 0;
    gwhScore.html(0);
    gwhRate.html(0 + "%");
    if(!muted){
        introAudio.currentTime = 0;
        introAudio.play();
    }
}

// Give lives to player when game starts
function giveLives(){
    for(i = 0; i < 2; ++i){
        var lifeDivStr = "<div id='life-" + i + "' class='life'><img src='img/Main Ship - Base - Full health.png'/></div>"
        gwhGame.append(lifeDivStr);
        var currentLife = $('#life-' + i);
    }
}

// Handle automatic spawning of asteroids
function asteroidSpawner(){
    if(state == STATES.running){
        let minFrequency = spawnFrequency * 0.5;
        let maxFrequency = spawnFrequency * 1.5;
        let randomSpawnFrequency = (Math.random() * (maxFrequency - minFrequency)) + minFrequency;
        asteroidSpawning = setInterval(function(){
            //var randomSpawnFrequency = (Math.random() * (maxFrequency - minFrequency)) + minFrequency;
            if(asteroidCounter >= 10){
                createShield();
                asteroidCounter = 0;
            }
            else{
                createAsteroid();
            }
            console.log("Seconds until next asteroid: " + (1/randomSpawnFrequency));
        }, (1/randomSpawnFrequency)*1000);
    }
}

function explode(){
    explosion.show();
    if(!muted){
        explosionAudio.play();
    }
    setTimeout(
        function(){
          explosion.hide();
        }, 500);
}

function keydownRouter(e) {
  switch (e.which) {
    case KEYS.shift:
      //createAsteroid();
      break;
    case KEYS.spacebar:
      if(state == STATES.running && shootPressed === false){
          fireRocket();
          shootPressed = true;
      }
      break;
    case KEYS.left:
    case KEYS.right:
    case KEYS.up:
    case KEYS.down:
      moveShip(e.which);
      break;
    default:
      //console.log("Invalid input!");
  }
}

function keyupRouter(e) {
  switch (e.which) {
    case KEYS.spacebar:
      shootPressed = false;

  }
}

// Check for any collisions and remove the appropriate object if needed
function checkCollisions() {
  // First, check for rocket-asteroid checkCollisions
  /* NOTE: We dont use a global handle here because we need to refresh this
   * list of elements when we make the reference.
   */
  $('.rocket').each( function() {
    var curRocket = $(this);  // define a local handle for this rocket
    $('.asteroid').each( function() {
      var curAsteroid = $(this);  // define a local handle for this asteroid

      // For each rocket and asteroid, check for collisions
      if (isColliding(curRocket,curAsteroid)) {
        // If a rocket and asteroid collide, destroy both
        curRocket.remove();
        curAsteroid.remove();

        // play asteroid boom
        if(!muted){
            Sound.playAsteroid();
        }

        // Score points for hitting an asteroid! Smaller asteroid --> higher score
        var points = Math.ceil(MAX_ASTEROID_SIZE-curAsteroid.width()) * SCORE_UNIT;
        // Update the visible score
        gwhScore.html(parseInt($('#score-box').html()) + points);

        // Increment asteroids asteroidsDestroyed
        asteroidsDestroyed++;

        // Increment our asteroid counter for the item drop Rate
        asteroidCounter++;
        // Update rate box
        var accuracyRate = Math.floor((asteroidsDestroyed / rocketsFired) * 100);
        gwhRate.html(accuracyRate.toString() + "%");
      }
    });
    // Now we need to check for rocket-shield collisions
    $('.shield').each(function(){
        var curShield = $(this); // local handle for this shield
        if (isColliding(curRocket, curShield)) {
            curRocket.remove();
            curShield.remove();
        }
    });
  });


  // Next, check for asteroid-ship interactions
  $('.asteroid').each( function() {
    var curAsteroid = $(this);
    if (isColliding(curAsteroid, ship)) {

      // Shields are down, Captain!
      if(!shielded){
          // Remove all game elements
          $('.rocket').remove();  // remove all rockets
          $('.asteroid').remove();  // remove all asteroids

          //Explode!
          explode();

          // Reduce live and end game if reduced to -1
          if(lifeIndex == -1){

              // Stop asteroids from Spawning
              clearInterval(asteroidSpawning);
              if(!muted){
                  gameOverAudio.currentTime = 0;
                  gameOverAudio.play();
              }
              // wait for explosion
              setTimeout(function(){
                  // Hide primary windows
                  gwhGame.hide();
                  // Show "Game Over" screen
                  gwhOver.show();
                  // set state to gameover
                  state = STATES.gameover;
                  // Display score
                  gwhOverScore.html(parseInt(gwhScore.html()));
                  lifeIndex = 1;
                  // reposition ship
                  ship.css('top', 530+"px");
                  ship.css('left', 122+"px");
              }, 500);
          }

          // In this case, there are still lives left
          else{
              var currentLife = $('#life-' + lifeIndex);
              currentLife.remove();
              if($('#shield-' + shieldIdx).length){
                  var currentShield = $('#shield-' + shieldIdx);
                  currentShield.remove();
              }
              lifeIndex--;
          }
      }
      // We have a shield!
      else{
          // hide the shield on the ship
          shield.hide();
          // Deflection sound
          if(!muted){
              shieldDeflectAudio.play();
          }
          // destroy the asteroid that hit the ship
          curAsteroid.remove();
          // we have no shields now
          shielded = false;
      }
    }
  });

  // Now let's check for shield-ship collisions
  $('.shield').each( function(){
      var curShield = $(this);
      if(isColliding(curShield, ship)){
          // delete the floating shield
          curShield.remove();
          // Shields up, Captain!
          shielded = true;
          // Display the shield on the ship
          shield.show();
          if(!muted){
              shieldActivatedAudio.play();
          }
      }
  })

}

// Check if two objects are colliding
function isColliding(o1, o2) {
  // Define input direction mappings for easier referencing
  o1D = { 'left': parseInt(o1.css('left')),
          'right': parseInt(o1.css('left')) + o1.width(),
          'top': parseInt(o1.css('top')),
          'bottom': parseInt(o1.css('top')) + o1.height()
        };
  o2D = { 'left': parseInt(o2.css('left')),
          'right': parseInt(o2.css('left')) + o2.width(),
          'top': parseInt(o2.css('top')),
          'bottom': parseInt(o2.css('top')) + o1.height()
        };

  // If horizontally overlapping...
  if ( (o1D.left < o2D.left && o1D.right > o2D.left) ||
       (o1D.left < o2D.right && o1D.right > o2D.right) ||
       (o1D.left < o2D.right && o1D.right > o2D.left) ) {

    if ( (o1D.top > o2D.top && o1D.top < o2D.bottom) ||
         (o1D.top < o2D.top && o1D.top > o2D.bottom) ||
         (o1D.top > o2D.top && o1D.bottom < o2D.bottom) ) {

      // Collision!
      return true;
    }
  }
  return false;
}

// Return a string corresponding to a random HEX color code
function getRandomColor() {
  // Return a random color. Note that we don't check to make sure the color does not match the background
  return '#' + (Math.random()*0xFFFFFF<<0).toString(16);
}

// Handle asteroid creation events
function createAsteroid() {
  console.log('Spawning asteroid...');

  // NOTE: source - http://www.clipartlord.com/wp-content/uploads/2016/04/aestroid.png
  var asteroidDivStr = "<div id='a-" + asteroidIdx + "' class='asteroid'></div>"
  // Add the rocket to the screen
  gwhGame.append(asteroidDivStr);
  // Create and asteroid handle based on newest index
  var curAsteroid = $('#a-'+asteroidIdx);

  asteroidIdx++;  // update the index to maintain uniqueness next time

  // Set size of the asteroid (semi-randomized)
  var astrSize = MIN_ASTEROID_SIZE + (Math.random() * (MAX_ASTEROID_SIZE - MIN_ASTEROID_SIZE));
  curAsteroid.css('width', astrSize+"px");
  curAsteroid.css('height', astrSize+"px");
  curAsteroid.append("<img src='img/asteroid.png' height='" + astrSize + "'/>")

  /* NOTE: This position calculation has been moved lower since verD -- this
  **       allows us to adjust position more appropriately.
  **/
  // Pick a random starting position within the game window
  var startingPosition = Math.random() * (gwhGame.width()-astrSize);  // Using 50px as the size of the asteroid (since no instance exists yet)

  // Set the instance-specific properties
  curAsteroid.css('left', startingPosition+"px");

  // Make the asteroids fall towards the bottom
  setInterval( function() {
    curAsteroid.css('top', parseInt(curAsteroid.css('top'))+ASTEROID_SPEED);
    // Check to see if the asteroid has left the game/viewing window
    if (parseInt(curAsteroid.css('top')) > (gwhGame.height() - curAsteroid.height())) {
      curAsteroid.remove();
    }
  }, OBJECT_REFRESH_RATE);
}

// Handle shield creation events
function createShield() {
  console.log('Spawning shield...');

  var shieldDivStr = "<div id='shield-" + shieldIdx + "' class='shield'></div>"
  // Add the shield to the screen
  gwhGame.append(shieldDivStr);
  // Create a shield handle based on newest index
  var curShield = $('#shield-'+shieldIdx);

  shieldIdx++;  // update the index to maintain uniqueness next time

  // Set size of the shield (semi-randomized)
  curShield.css('width', 80+"px");
  curShield.css('height', 80+"px");
  curShield.append("<img src='img/Main Ship - Shields - Round Shield.gif' height='" + 80 + "'/>")

  /* NOTE: This position calculation has been moved lower since verD -- this
  **       allows us to adjust position more appropriately.
  **/
  // Pick a random starting position within the game window
  var startingPosition = Math.random() * (gwhGame.width()-80);

  // Set the instance-specific properties
  curShield.css('left', startingPosition+"px");

  // Make the shields fall towards the bottom
  setInterval( function() {
    curShield.css('top', parseInt(curShield.css('top'))+ASTEROID_SPEED);
    // Check to see if the shield has left the game/viewing window
    if (parseInt(curShield.css('top')) > (gwhGame.height() - curShield.height())) {
      curShield.remove();
    }
  }, OBJECT_REFRESH_RATE);
}

// Handle "fire" [rocket] events
function fireRocket() {
  // increment rocketsFired
  rocketsFired++;
  // Update rate box
  var accuracyRate = Math.floor((asteroidsDestroyed / rocketsFired) * 100);
  gwhRate.html(accuracyRate.toString() + "%");
  console.log('Firing rocket...');

  var rocketDivStr = "<div id='r-" + rocketIdx + "' class='rocket'><img src='img/Main ship weapon - Projectile - Rocket.png'/></div>";
  // Add the rocket to the screen
  gwhGame.append(rocketDivStr);
  // Create and rocket handle based on newest index
  var curRocket = $('#r-'+rocketIdx);
  rocketIdx++;  // update the index to maintain uniqueness next time

  // Set vertical position
  curRocket.css('top', ship.css('top'));
  // Set horizontal position
  
  var rxPos = parseInt(ship.css('left'));

  if(rocketsFired % 2 === 0){
    rxPos += 8;  // In order to center the rocket, shift by half the div size (recall: origin [0,0] is top-left of div)
  }
  else{
    rxPos -= 11; 
  }

  console.log(rxPos);

  curRocket.css('left', rxPos + "px");

  // play rocket audio
  if(!muted){

    Sound.playRocket();
      
  }

  // Create movement update handler
  setInterval( function() {
    curRocket.css('top', parseInt(curRocket.css('top'))-ROCKET_SPEED);
    // Check to see if the rocket has left the game/viewing window
    if (parseInt(curRocket.css('top')) < curRocket.height()) {
      //curRocket.hide();
      curRocket.remove();
    }
  }, OBJECT_REFRESH_RATE);
}

// Handle ship movement events
function moveShip(arrow) {
  switch (arrow) {
    case KEYS.left:  // left arrow
      var newPos = parseInt(ship.css('left'))-SHIP_SPEED;
      if (newPos < 0) {
        newPos = 0;
      }
      ship.css('left', newPos);
    break;
    case KEYS.right:  // right arrow
      var newPos = parseInt(ship.css('left'))+SHIP_SPEED;
      if (newPos > maxShipPosX) {
        newPos = maxShipPosX;
      }
      ship.css('left', newPos);
    break;
    case KEYS.up:  // up arrow
      var newPos = parseInt(ship.css('top'))-SHIP_SPEED;
      if (newPos < 0) {
        newPos = 0;
      }
      ship.css('top', newPos);
    break;
    case KEYS.down:  // down arrow
      var newPos = parseInt(ship.css('top'))+SHIP_SPEED;
      if (newPos > maxShipPosY) {
        newPos = maxShipPosY;
      }
      ship.css('top', newPos);
    break;
  }
}

Sound = (function() {
  var self = {};

  self.playRocket = function() {
    rocket_channel.play();
  }

  self.playAsteroid = function() {
    asteroid_channel.play();
  }

  // self.playBack = function() {
  //   if (GAME.isReady()) { sfx_switcher_back.play(); }
  // }

  // self.playSuccess = function() {
  //   if (GAME.isReady()) { sfx_switcher_success.play(); }
  // }

  // self.playStart = function() {
  //   if (GAME.isReady()) { sfx_switcher_start.play(); }
  // }

  self.init = function() {
    // sfx_switcher_front   = new Switcher('sfx/flip-front.mp3', 10);
    // sfx_switcher_back    = new Switcher('sfx/flip-back.mp3', 10);
    // sfx_switcher_success = new Switcher('sfx/success.mp3', 2);
    rocket_channel   = new channelHandler('audio/spacegame blast 04.wav', 10);
    asteroid_channel = new channelHandler('audio/spacegame rock boom small 01.wav', 10);
  }

  return self;}());
