const slider = document.getElementById("depthSlider");
const canvas = document.getElementById("snowCanvas");
const ctx = canvas.getContext("2d");

const MIN_PIXEL_SIZE = 2; // Length of a line segment in pixels, where recursion stops
const SNOWFLAKE_BASE_SIZE = 300; // Size of snowflake in pixels when scale = 1
const BASE_LINE_WIDTH = 1; // Base line width in pixels when scale = 1

//Variables for panning and zooming
let scale = 1;
let offsetX = 0;
let offsetY = 0;
ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

// View bounds in world coordinates
let viewLeft, viewRight, viewTop, viewBottom;

/** Update view bounds in world coordinates */
function updateViewBounds() {
    const w = canvas.width;
    const h = canvas.height;
    // Convert screen corners into world coordinates
    viewLeft   = (-offsetX - w/2) / scale;
    viewRight  = (-offsetX + w/2) / scale;
    viewTop    = (-offsetY - h/2) / scale;
    viewBottom = (-offsetY + h/2) / scale;
}

/** Resizes the canvas to fill the window and redraws the snowflake */
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - slider.offsetHeight; //Account for slider height
    drawSnowflake();
}

//Event listeners for depth slider and window resize
slider.addEventListener("input", drawSnowflake);
window.addEventListener("resize", resizeCanvas);
resizeCanvas(); //Initial sizing

// Event listeners for panning, zooming and depth adjustment
// Mouse wheel for zooming
canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;

    // Get mouse position relative to screen
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Convert screen → world
    const worldX = (screenX - (canvas.width / 2) - offsetX) / scale;
    const worldY = (screenY - (canvas.height / 2) - offsetY) / scale;

    scale *= zoomFactor;

    // Recompute offset so zoom centers on cursor
    offsetX = screenX - canvas.width/2 - worldX * scale;
    offsetY = screenY - canvas.height/2 - worldY * scale;

    drawSnowflake();
});
// Keyboard events for panning and depth adjustment
window.addEventListener("keydown", e => {
    const pan = 40 / scale; // pan less when zoomed in
    if (e.key === "ArrowUp") offsetY += pan;
    if (e.key === "ArrowDown") offsetY -= pan;
    if (e.key === "ArrowLeft") offsetX += pan;
    if (e.key === "ArrowRight") offsetX -= pan;
    // Adjust depth with + and - keys
    if (e.key === "+") slider.value = Math.min(parseInt(slider.value) + 1, parseInt(slider.max)); 
    if (e.key === "-") slider.value = Math.max(parseInt(slider.value) - 1, parseInt(slider.min));
    drawSnowflake();
});
// Variables for mouse dragging
let dragging = false;
let lastX, lastY;
// Mouse events for dragging
canvas.addEventListener("mousedown", e => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
});
canvas.addEventListener("mousemove", e => {
    if (!dragging) return;
    offsetX += e.clientX - lastX;
    offsetY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    drawSnowflake();
});
canvas.addEventListener("mouseup", () => dragging = false);
canvas.addEventListener("mouseleave", () => dragging = false);


/** Draws the Koch snowflake */
function drawSnowflake() {
    const depth = parseInt(document.getElementById("depthSlider").value);

    const w = canvas.width;
    const h = canvas.height;

    //---Update view bounds BEFORE transform---
    updateViewBounds();

    // --- Apply transform --- 
    // Move origin to center of screen, then apply zoom and pan 
    ctx.setTransform(scale, 0, 0, scale, offsetX + w/2, offsetY + h/2); 

    // --- Clear screen in world coordinates --- 
    ctx.clearRect((-offsetX - w/2) / scale, 
                  (-offsetY - h/2) / scale, 
                  w / scale, 
                  h / scale); 

    // --- Line width scales with zoom --- 
    ctx.lineWidth = BASE_LINE_WIDTH / scale;

    //---Find the vertices of the initial triangle---
    const sides = SNOWFLAKE_BASE_SIZE; 
    const height = sides*Math.cos(Math.PI/6); 
    p1 = {x:  sides/2,     y:  height/2 - height/6}
    p2 = {x: -sides/2,     y:  height/2 - height/6}
    p3 = {x:  0,           y: -height/2 - height/6}

    //---Draw a Koch curve on all three edges of the triangle---
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);    
    drawKochCurve(p1.x, p1.y, p2.x, p2.y, depth);
    drawKochCurve(p2.x, p2.y, p3.x, p3.y, depth);
    drawKochCurve(p3.x, p3.y, p1.x, p1.y, depth);
    ctx.stroke();
}

/** Recursively draws a Koch curve between two points */
function drawKochCurve(x1, y1, x2, y2, depth){
    //Skip drawing if segment is outside view
    if (segmentIsOutsideView(x1, y1, x2, y2)) { 
        ctx.moveTo(x2, y2);
        return; 
    }

    //Base case: When depth is 0 or the points are too close to each other, draw straight line
    const dist = Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);
    if(depth == 0 || dist * scale < MIN_PIXEL_SIZE){
        ctx.lineTo(x2,y2);
        return;
    }

    const len = dist/3; //Length of new lines

    const dx = x2-x1;   
    const dy = y2-y1;
    
    //Point on the new triangle closest to p1 
    const x3 = x1+(dx/3);    
    const y3 = y1+(dy/3);

    //Point on the new triangle closest to p2
    const x4 = x2-(dx/3);
    const y4 = y2-(dy/3);


    /**
    * Points should be orientated like this:
    * 
    *   p1 - - p3      p4 - - p2
    *           \    /
    *            \  /
    *             p5
    */

    //Angle between x-axis and the line (p1,p2)
    let ang = Math.atan2(dy, dx);
    //Angle between x-axis and the line (p3,p5)
    ang -= Math.PI/3;
    
    //Last point of new triangle
    const x5 = x3 + len * Math.cos(ang);
    const y5 = y3 + len * Math.sin(ang);

    //Recursive calls
    drawKochCurve(x1,y1, x3,y3, depth-1);
    drawKochCurve(x3,y3, x5,y5, depth-1);
    drawKochCurve(x5,y5, x4,y4, depth-1);
    drawKochCurve(x4,y4, x2,y2, depth-1);
}

function segmentIsOutsideView(x1, y1, x2, y2) {
    //Add margin to view bounds to avoid popping
    dx = x2-x1; dy = y2-y1;
    distance = Math.sqrt(dx*dx + dy*dy);
    const margin = distance / 3;

    return  Math.min(x1, x2) > viewRight + margin || 
            Math.max(x1, x2) < viewLeft - margin || 
            Math.min(y1, y2) > viewBottom + margin || 
            Math.max(y1, y2) < viewTop - margin;
}
