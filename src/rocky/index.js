var rocky = require('rocky');
var weatherImages = require('../common/weatherImages');

var fontNumber = 18;
var fontStyle = fontNumber + 'px bold Gothic';
var weather;

// Helper functions
function fractionToRadian(fraction) {
  return fraction * 2 * Math.PI;
}

function getSideEntPoints(ctx, cx, cy, length, side, text) {
  // Definitions for ent points
  var cy_up = 0;
  var cy_down = Math.PI;
  var cy_center = 1/2 * Math.PI;
  
  var cx_left = -1/2 * Math.PI;
  var cx_right = 1/2 * Math.PI;
  var cx_center = 0;
  
  var dimensions = ctx.measureText(text);
  
  // Set point up or down
  var pos_y, pos_x;
  if (side.indexOf('up')>=0) {
    
    pos_y = cy_up;
  } else {
    pos_y = cy_down;
  }
  
  // Set point right or left
  if (side.indexOf('right')>=0) {
    pos_x = cx_right;
  } else {
    pos_x = cx_left;
  }
  
  // Find the ent points
  var x2 = cx + Math.sin(pos_x) * length;
  var y2 = (cy - dimensions.height/2) - Math.cos(pos_y) * length;
  
  return {x:x2, y:y2};
}

function twoDigit(n) {
    if (n < 10) {
      return "0" + n;
    } else if (n > 100) {
      var m = n.toString();
      return m.substring(m.length-2, m.length);
    } else {
      return "" + n;
    }
  }

// Draw functions
function drawHand(ctx, cx, cy, angle, length, color) {
  // Find the ent points
  var x2 = cx + Math.sin(angle) * length;
  var y2 = cy - Math.cos(angle) * length;

  // Configure how we want to draw the hand
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;

  // Begin drawing
  ctx.beginPath();

  // Move to the center point, then draw the line
  ctx.moveTo(cx, cy);
  ctx.lineTo(x2, y2);
  
  // examples for arc elements
  //ctx.arc(72, 84, 40, 0, 1, false);
  //ctx.arc(80, 94, 40, 0, 1, false);

  // Stroke the line (output to display)
  ctx.stroke();
}

function drawMinuteCircle(ctx, cx, cy, date, radius) {
  // Draw background circle
  ctx.fillStyle = 'white';
  ctx.rockyFillRadial(cx, cy, 0, radius, 0, 2 * Math.PI);
  
  // Draw minute Text
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  ctx.font = fontStyle;
  console.log(fontStyle);
  ctx.fillText(date.getMinutes(), cx, (cy - 12));
}

function drawDate(ctx, cx, cy, length, side, date) {
  // Build date string
  var datestring = twoDigit(date.getUTCDate()) + '.' + twoDigit(date.getUTCMonth()+1) + '.' + twoDigit(date.getFullYear());
  
  // Find the ent points
  var entPoints = getSideEntPoints(ctx, cx, cy, length, side, datestring);
    
  // Draw the text
  ctx.fillStyle = 'lightgray';
  ctx.textAlign = 'center';
  ctx.font = fontStyle;
  ctx.fillText(datestring, entPoints.x, entPoints.y);
}

function drawWeather(ctx, cx, cy, length, side, weather) {
  // Create a string describing the weather
  var weatherString = weather.celcius + 'ºC,'; // + weather.desc;
  // var weatherString = weather.fahrenheit + 'ºF,'; // + weather.desc;

  // get image
  if (weather.icon) {
    var icon = weatherImages[weather.icon];
    var weather_icon = rocky.gdraw_command_image_create({
      url: 'https://raw.githubusercontent.com/pebble-examples/cards-example/master/resources/Pebble_50x50_' + weather.icon + '.svg'
    });

    var started = new Date().getTime();
    rocky.update_proc = function (ctx, bounds) {
      gdraw_command_image_draw(ctx, svgImage, [15, 15]);

      var elapsed = new Date().getTime() - started;
      var frame = gdraw_command_sequence_get_frame_by_elapsed(pdcSequence, elapsed);
      gdraw_command_frame_draw(ctx, pdcSequence, frame, [70, 40]);

      // we want to keep the current frame of the animation for as long as its duration says,
      // as we're picking each from based on the 'elapsed time' we just need to do nothing for the duration
      // of the current frame and schedule a render pass after that
      var frameDuration = gdraw_command_frame_get_duration(frame);
      setTimeout(function(){rocky.mark_dirty()}, frameDuration);
    };
  }

  // Find the ent points
  var entPoints = getSideEntPoints(ctx, cx, cy, length, side, weatherString);
  
  // Draw the text
  ctx.fillStyle = 'lightgray';
  ctx.textAlign = 'center';
  ctx.font = fontStyle;
  ctx.fillText(weatherString, entPoints.x, entPoints.y);
}

// Handle draw event
rocky.on('draw', function(event) {
  // Get the CanvasRenderingContext2D object
  var ctx = event.context;
  
  // Current date/time
  var d = new Date();
  
  // Clear the screen
  ctx.clearRect(0, 0, ctx.canvas.clientWidth, ctx.canvas.clientHeight);

  // Determine the width and height of the display
  var w = ctx.canvas.unobstructedWidth;
  var h = ctx.canvas.unobstructedHeight;
  
  // Determine the center point of the display
  var center_x = w / 2;
  var center_y = h / 2;
  
  // -20 so we're inset 10px on each side
  var maxLength = (Math.min(w, h) - 10) / 2;
  
  // Draw the conditions (before clock hands, so it's drawn underneath them)
  var side_weather, side_date, hour;
  if (d.getHours() % 12 <= 6) {
    side_weather = 'down, left';
    side_date = 'up, left';
    hour = 0;
  } else {
    side_weather = 'down, right';
    side_date = 'up, right';
    hour = 6;
  }
  if (weather) drawWeather(ctx, center_x, center_y, maxLength * 0.5, side_weather, weather);
  drawDate(ctx, center_x, center_y, maxLength * 0.5, side_date, d);
  
  // Draw hour time
  var color = "lightgray";
  for (; hour <= d.getHours() % 12; hour++) {
    // Calculate the hour hand angle
    var hourFraction = (hour) / 12;
    var hourAngle = fractionToRadian(hourFraction);
    
    if (hour == d.getHours()) {
      color = "green";
    } else if (hour == d.getHours() % 12) {
      color = "purple";
    }
    
    // Draw the hour hand
    drawHand(ctx, center_x, center_y, hourAngle, maxLength, color);
  }
  
  // Draw the minute part
  drawMinuteCircle(ctx, center_x, center_y, d, 20);
  
});

// Handle other events
rocky.on('hourchange', function(event) {
  // Send a message to fetch the weather information (on startup and every hour)
  rocky.postMessage({'fetch': true});
});

rocky.on('minutechange', function(event) {
  // next minute
  console.log('There is a next minute');
  
  // Request the screen to be redrawn on next pass
  rocky.requestDraw();
});

rocky.on('message', function(event) {
  // Receive a message from the mobile device (pkjs)
  var message = event.data;

  if (message.weather) {
    // Save the weather data
    weather = message.weather;

    // Request a redraw so we see the information
    rocky.requestDraw();
  }
});