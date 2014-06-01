/* line drawing hacks */
var drawLine;
var getCenter;
var coordsForCardNum;
document.addEventListener('DOMContentLoaded', function () {

    var lines = document.querySelector(".lines");

    function getCenter( el ) {
        var _x = 0;
        var _y = 0;
        var _w = el.offsetWidth|0;
        var _h = el.offsetHeight|0;
        while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
            _x += el.offsetLeft - el.scrollLeft;
            _y += el.offsetTop - el.scrollTop;
            el = el.offsetParent;
        }
        //return { top: _y, left: _x, width: _w, height: _h };
        return {x: _x + _w / 2, y: _y + _h / 2};
    }

    coordsForCardNum = function (index) {
        var card = document.querySelectorAll(".card")[index];
        return getCenter(card);
    };

    drawLine = function drawLine(start, end, color, thickness, duration) { // draw a line connecting elements
        // center
        var x1 = start.x;
        var y1 = start.y;
        // center
        var x2 = end.x;
        var y2 = end.y;
        // distance
        var length = Math.sqrt(((x2-x1) * (x2-x1)) + ((y2-y1) * (y2-y1)));
        // center
        var cx = ((x1 + x2) / 2) - (length / 2);
        var cy = ((y1 + y2) / 2) - (thickness / 2);
        // angle
        var angle = Math.atan2((y1-y2),(x1-x2))*(180/Math.PI);

        var iDiv = document.createElement('div');
    	iDiv.className = 'line';
    	iDiv.style.cssText = "height:" + thickness + 
        "px; background-color:" + color + "; left:" + cx 
        + "px; top:" + cy + "px; width:" + length 
        + "px; -moz-transform:rotate(" 
            + angle + "deg); -webkit-transform:rotate(" + angle 
            + "deg); -o-transform:rotate(" + angle 
            + "deg); -ms-transform:rotate(" + angle 
            + "deg); transform:rotate(" + angle + "deg);"
    	lines.appendChild(iDiv);
    	setTimeout(function () {
    		lines.removeChild(iDiv);
    	}, duration);
    }
});
