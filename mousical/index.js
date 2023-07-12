import { autoCorrelate } from "./autoCorrelate.js";

function init() {
  var source;
  var audioContext = new (window.AudioContext || window.webkitAudioContext)();
  var analyser = audioContext.createAnalyser();
  analyser.minDecibels = -100;
  analyser.maxDecibels = -10;
  analyser.smoothingTimeConstant = 0.85;
  if (!navigator?.mediaDevices?.getUserMedia) {
    // No audio allowed
    alert('Sorry, getUserMedia is required for the app.')
    return;
  } else {
    var constraints = {audio: true};
    navigator.mediaDevices.getUserMedia(constraints)
      .then(
        function(stream) {
          // Initialize the SourceNode
          source = audioContext.createMediaStreamSource(stream);
          // Connect the source node to the analyzer
          source.connect(analyser);
          visualize();
        }
      )
      .catch(function(err) {
        console.log(err);
        alert('Sorry, microphone permissions are required for the app. Feel free to read on without playing :)')
      });
  }


  function visualize() {

    // Thanks to PitchDetect: https://github.com/cwilso/PitchDetect/blob/master/js/pitchdetect.js
    // var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    // function noteFromPitch( frequency ) {
    //   var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
    //   return Math.round( noteNum ) + 69;
    // }

    // var displayValue = document.querySelector('input[name="display"]:checked').value
    // if (displayValue == 'sine') {
    //   draw();
    // } else {
    //   drawFrequency();
    // }

    drawSine(document.querySelector(".sine"), analyser);
    drawFrequency(document.querySelector(".freq"), analyser);
    setInterval(() => drawNote(analyser, audioContext), 100);
  }
}

document.querySelector("button").addEventListener("click", () => {
  init();
})
  

function drawSine(canvas, analyser) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  function draw() {
    analyser.fftSize = 2048;
    var bufferLength = analyser.fftSize;
    var dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = 'rgb(200, 200, 200)';
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(0, 0, 0)';

    ctx.beginPath();

    var sliceWidth = width * 1.0 / bufferLength;
    var x = 0;

    for(var i = 0; i < bufferLength; i++) {

      var v = dataArray[i] / 128.0;
      var y = v * height/2;

      if(i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height/2);
    ctx.stroke();

    requestAnimationFrame(draw);
  }
  
  draw();
}


function drawFrequency(canvas, analyser) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  var bufferLengthAlt = analyser.frequencyBinCount;
  var dataArrayAlt = new Uint8Array(bufferLengthAlt);

  ctx.clearRect(0, 0, width, height);

  function draw() {
    analyser.getByteFrequencyData(dataArrayAlt);

    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, width, height);

    var barWidth = (width / bufferLengthAlt) * 2.5;
    var barHeight;
    var x = 0;

    for(var i = 0; i < bufferLengthAlt; i++) {
      barHeight = dataArrayAlt[i];

      ctx.fillStyle = 'rgb(' + (barHeight+100) + ',50,50)';
      ctx.fillRect(x,height-barHeight/2,barWidth,barHeight/2);

      x += barWidth + 1;
    }

    requestAnimationFrame(draw);
  };

  draw();
}

function drawNote(analyser, audioContext) {
  var previousValueToDisplay = 0;
  var smoothingCount = 0;
  var smoothingThreshold = 10;
  var smoothingCountThreshold = 5;

  var bufferLength = analyser.fftSize;
  var buffer = new Float32Array(bufferLength);
  analyser.getFloatTimeDomainData(buffer);
  var autoCorrelateValue = autoCorrelate(buffer, audioContext.sampleRate)

  // Handle rounding
  var valueToDisplay = autoCorrelateValue;
  valueToDisplay = Math.round(valueToDisplay);

  const similarNote = () => Math.abs(valueToDisplay - previousValueToDisplay) < smoothingThreshold

  // Check if this value has been within the given range for n iterations
  if (similarNote()) {
    if (smoothingCount < smoothingCountThreshold) {
      smoothingCount++;
    } else {
      previousValueToDisplay = valueToDisplay;
      smoothingCount = 0;
    }
  } else {
    previousValueToDisplay = valueToDisplay;
    smoothingCount = 0;
  }

  // var roundingValue = document.querySelector('input[name="rounding"]:checked').value
  // if (roundingValue == 'none') {
  //   // Do nothing
  // } else if (roundingValue == 'hz') {
  //   valueToDisplay = Math.round(valueToDisplay);
  // } else {
  //   // Get the closest note
  //   // Thanks to PitchDetect:
  //   valueToDisplay = noteStrings[noteFromPitch(autoCorrelateValue) % 12];
  // }

  if (autoCorrelateValue === -1) {
    // console.log('Too quiet...');
    valueToDisplay = 0;
  }

  // console.log(valueToDisplay);

  document.querySelector('.note').innerText = valueToDisplay + " hz";

  if (Math.abs(valueToDisplay - 960) < 20) {
    let event = new KeyboardEvent('keydown', { keyCode: 37 });

    document.dispatchEvent(event);
  }

  if (Math.abs(valueToDisplay - 1000) < 20) {
    let event = new KeyboardEvent('keydown', { keyCode: 38 });

    document.dispatchEvent(event);
  }

  if (Math.abs(valueToDisplay - 1100) < 20) {
    let event = new KeyboardEvent('keydown', { keyCode: 39 });

    document.dispatchEvent(event);
  }


  if (Math.abs(valueToDisplay - 1200) < 50) {
    let event = new KeyboardEvent('keydown', { keyCode: 40 });

    document.dispatchEvent(event);
  }

  
}

snake(document.querySelector(".snake"));

function snake(canvas) {
  let context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  let box = width/16;
  let snake = [];
  snake[0] = { x: 0, y: 0 };
  let direction;

  let food = {
      x: Math.floor(Math.random() * 15 + 1),
      y: Math.floor(Math.random() * 15 + 1),
  };

  function createBG() {
      context.fillStyle = "lightgreen";
      context.fillRect(0, 0, 16 * box, 16 * box);
  }

  function createSnake() {
      for (let i = 0; i < snake.length; i++) {
          context.fillStyle = "green";
          context.fillRect(snake[i].x*box, snake[i].y*box, box, box);
      }
  }

  function drawFood() {
      context.fillStyle = "red";
      context.fillRect(food.x*box, food.y*box, box, box);
  }

  document.addEventListener('keydown', update);

  function update(event) {
      if(event.keyCode == 37 && direction != 'right') direction = 'left';
      if(event.keyCode == 38 && direction != 'down') direction = 'up';
      if(event.keyCode == 39 && direction != 'left') direction = 'right';
      if(event.keyCode == 40 && direction != 'up') direction = 'down';
  }

  function startGame() {
      if (snake[0].x > 15) snake[0].x = 0;
      if (snake[0].x < 0) snake[0].x = 15;
      if (snake[0].y > 15) snake[0].y = 0;
      if (snake[0].y < 0) snake[0].y = 15;

      createBG();
      createSnake();
      drawFood();

      let snakeX = snake[0].x;
      let snakeY = snake[0].y;

      if (direction == "right") snakeX += 1;
      if (direction == "left") snakeX -= 1;
      if (direction == "up") snakeY -= 1;
      if (direction == "down") snakeY += 1;

      if (snakeX != food.x || snakeY != food.y) {
          snake.pop();
      } else {
          food.x = Math.floor(Math.random() * 15 + 1);
          food.y = Math.floor(Math.random() * 15 + 1);
      }

      let newHead = {
          x: snakeX,
          y: snakeY,
      };

      snake.unshift(newHead);
  }

  let game = setInterval(startGame, 100);
}

