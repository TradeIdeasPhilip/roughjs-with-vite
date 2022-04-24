import "./style.css";

import rough from "roughjs";
import { getAudioBalanceControl, getById } from "./lib/client-misc";
import { Point } from "roughjs/bin/geometry";
import { Options } from "roughjs/bin/core";

import whackUrl from "../Whack.mp3?url";

// I copied these somewhat arbitrary dimensions from https://github.com/TradeIdeasPhilip/bounce-3d/blob/master/src/main.ts
// so I wouldn't have to start from scratch.
const boxMax = 14;
const boxMin = -boxMax;
const boxSize = boxMax - boxMin;
const ballRadius = 1.5;
// The _center_ of the ball can _not_ go all the way to the wall.
// Always reserve one ball radius.
const ballMin = boxMin + ballRadius;
const ballMax = boxMax - ballRadius;
const ballRange = ballMax - ballMin;

/**
 * A point in three dimensions.
 */
type Point3 = {
  /**
   * Negative numbers move left, positive numbers move right.
   * Standard for algebra class _and_ most computer graphics.
   */
  x: number;
  /**
   * Negative numbers move down, positive numbers move up.
   * Standard for algebra class and what I used in bounce-3d.
   * **But** the _negative_ of what's normal for canvas and a lot of graphics.
   */
  y: number;
  /**
   * Negative numbers move ⨂ from your eyes toward the screen.
   * Positive numbers move ⦿ from the screen toward your eyes.
   */
  z: number;
};

/**
 * For use with `makeLinear()`.
 */
type LinearFunction = (x: number) => number;

/**
 * Linear interpolation and extrapolation.
 *
 * Given two points, this function will find the line that lines on those two points.
 * And it will return a function that will find all points on that line.
 * @param x1 One valid input.
 * @param y1 The expected output at x1.
 * @param x2 Another valid input.  Must differ from x2.
 * @param y2 The expected output at x2.
 * @returns A function of a line.  Give an x as input and it will return the expected y.
 */
function makeLinear(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): LinearFunction {
  const slope = (y2 - y1) / (x2 - x1);
  return function (x: number) {
    return (x - x1) * slope + y1;
  };
}

// This scale is somewhat arbitrary.
//
// I used 0 to 100 for the size of the svg.
// I'm reserving one unit on each side as margin/padding.
//
// This corresponds to the <svg>'s viewBox property.
//
// It would be convenient to put the origin in the center of the <svg>.
// The docs say I should be able to go from -50 to +50, but I've never gotten negative numbers to work.
const screenMin = 1;
const screenMax = 99;

/**
 * Scale a length on the screen to simulate depth.
 * @param z The z value at or near what we are measuring.
 * Negative values go from the user toward the screen.
 * Positive values go from the screen toward the user.
 * @returns A ratio.  This will be 1 for things that are on the close face of the box.
 * This will be smaller for things that are further away.
 */
const flattenRatio = makeLinear(boxMax, 1, boxMin, 0.5);

/**
 * Convert points from 3d to 2d.
 * @param param0 A point in the three dimensional world.
 * @returns The corresponding point in the 2d `<svg>`.
 */
function flatten({ x, y, z }: Point3): Point {
  // flattenRatio() is a simplified linear formula.  A more accurate formula would use an exponential.
  const ratio = flattenRatio(z);
  /**
   * Convert from box coordinates to screen coordinates.
   * @param xOrY the x value in box coordinates, or the negative of the y value in box coordinates.
   * @returns The x or y value in svg coordinates.
   */
  const converter = makeLinear(
    boxMin / ratio,
    screenMin,
    boxMax / ratio,
    screenMax
  );
  const flatX = converter(x);
  const flatY = converter(-y);
  return [flatX, flatY];
}

const svgBackground = getById("background", SVGGElement);
const svgForeground = getById("foreground", SVGGElement);
const svg = getById("main", SVGSVGElement);
const roughSvg = rough.svg(svg);

/**
 *
 * @param a
 * @param b
 * @returns A point half way between a and b.
 */
function midpoint(a: Point, b: Point): Point {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/**
 *
 * @param from A point on a line.
 * @param to A point on a line.
 * @param fromRatio How much the result should look like the `from` value.
 * @returns
 * * `fromRatio == 0` means to return `to` unaltered.
 * * `fromRatio == 1` means to return `from` unaltered.
 * * `fromRatio == 0.5`means to return the midpoint between `from` and `to`.
 * * Values less than 0 and greater than one will extrapolate along the same line.
 * * `from == to` means to ignore `fromRatio` and always return `to`.
 */
function interpolate(from: Point, to: Point, fromRatio: number): Point {
  const toRatio = 1 - fromRatio;
  return [
    from[0] * fromRatio + to[0] * toRatio,
    from[1] * fromRatio + to[1] * toRatio,
  ];
}

/**
 * A Wall object will draw one of the faces of the cube.
 */
class Wall {
  private static options(color: string): Options {
    return {
      stroke: "none",
      fill: color,
      fillStyle: "zigzag",
      hachureGap: 5,
      disableMultiStrokeFill: true,
      hachureAngle: Math.random() * 360,
      //preserveVertices: true,  -- This made things look more accurate, and that totally broke the vibe.
    };
  }
  #element: SVGElement | undefined;
  constructor(
    /**
     * The four corners of a one of the faces of the cube.
     * These should be ordered correctly for a call to `polygon()`.
     */
    private readonly points: Point[],
    /**
     * Draw the wall in this color.
     * Expects a css color string.
     */
    private readonly color: string,
    /**
     * When the ball bounces off this wall, draw the special effects in this color.
     * Defaults to the main color of the wall.
     */
    private readonly bounceColor = color
  ) {
    if (points.length != 4) {
      throw new Error("wtf");
    }
    this.refresh();
  }
  /**
   * Delete any previous drawings.
   */
  private clear() {
    if (this.#element) {
      this.#element.remove();
    }
    this.#element = undefined;
  }
  /**
   * Redraw the wall.  Clear any old drawings, first.
   */
  refresh() {
    this.clear();
    this.#element = roughSvg.polygon(this.points, Wall.options(this.color));
    svgBackground.appendChild(this.#element);
  }
  /**
   * Redraw the wall.
   * And start an animation sequence to highlight one point on the wall.
   *
   * Clear any old drawings, first.
   * @param toHighlight The point to highlight.
   * @param time From `performance.now()` or a callback from `requestAnimationFrame()`.
   */
  highlightPoint(toHighlight: Point3, time: DOMHighResTimeStamp) {
    this.clear();
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const options = Wall.options(this.color);
    const main = roughSvg.polygon(this.points, options);
    group.appendChild(main);
    this.#element = group;
    svgBackground.appendChild(group);

    const toHighlight2 = flatten(toHighlight);
    const startTime = time; //performance.now();
    const endTime = startTime + 350;
    const size = makeLinear(startTime, 0.025, endTime, 0.5);
    const gap = makeLinear(startTime, 2, endTime, 10);
    const weight = makeLinear(startTime, 0.85, endTime, 0.05);
    let bounce: SVGElement | undefined;
    let nextUpdate = -Infinity;
    const bounceOptions = {
      ...options,
      hachureAngle: options.hachureAngle! + 45,
      fillStyle: "cross-hatch",
      //fill: "none",
      roughness: 4,
      //hachureGap: 20,
      //stroke: this.color,
      //strokeWidth: 0.25,
      //fillWeight: 0.5
      fill: this.bounceColor,
    };
    const bounceAction = (time: DOMHighResTimeStamp) => {
      if (time < nextUpdate) {
        return;
      }
      nextUpdate = time + 100 + Math.random() * 75;
      if (bounce) {
        bounce.remove();
        bounce = undefined;
      }
      if (time > endTime) {
        Wall.#timerUpdate.delete(this);
      } else {
        const currentSize = size(time);
        if (!isFinite(currentSize) || currentSize < 0 || currentSize > 1) {
          debugger;
        }
        const bouncePoints = this.points.map((point) =>
          interpolate(point, toHighlight2, currentSize)
        );
        bounceOptions.hachureGap = gap(time);
        bounceOptions.fillWeight = weight(time);
        bounce = roughSvg.polygon(bouncePoints, bounceOptions);
        group.appendChild(bounce);
      }
    };
    Wall.#timerUpdate.set(this, bounceAction);
  }
  static #timerUpdate = new Map<Wall, (time: DOMHighResTimeStamp) => void>();
  static timerUpdate(time: DOMHighResTimeStamp) {
    for (const callback of this.#timerUpdate.values()) {
      callback(time);
    }
  }
}

const left = new Wall(
  [
    flatten({ x: boxMin, y: boxMin, z: boxMin }),
    flatten({ x: boxMin, y: boxMax, z: boxMin }),
    flatten({ x: boxMin, y: boxMax, z: boxMax }),
    flatten({ x: boxMin, y: boxMin, z: boxMax }),
  ],
  "#008000"
);

const right = new Wall(
  [
    flatten({ x: boxMax, y: boxMin, z: boxMin }),
    flatten({ x: boxMax, y: boxMax, z: boxMin }),
    flatten({ x: boxMax, y: boxMax, z: boxMax }),
    flatten({ x: boxMax, y: boxMin, z: boxMax }),
  ],
  "#000080"
);

const top = new Wall(
  [
    flatten({ x: boxMin, y: boxMax, z: boxMin }),
    flatten({ x: boxMax, y: boxMax, z: boxMin }),
    flatten({ x: boxMax, y: boxMax, z: boxMax }),
    flatten({ x: boxMin, y: boxMax, z: boxMax }),
  ],
  "#808000"
);

const bottom = new Wall(
  [
    flatten({ x: boxMin, y: boxMin, z: boxMin }),
    flatten({ x: boxMax, y: boxMin, z: boxMin }),
    flatten({ x: boxMax, y: boxMin, z: boxMax }),
    flatten({ x: boxMin, y: boxMin, z: boxMax }),
  ],
  "#008080"
);

const back = new Wall(
  [
    flatten({ x: boxMin, y: boxMin, z: boxMin }),
    flatten({ x: boxMax, y: boxMin, z: boxMin }),
    flatten({ x: boxMax, y: boxMax, z: boxMin }),
    flatten({ x: boxMin, y: boxMax, z: boxMin }),
  ],
  "#800000"
);

/*
const front = new Wall(
  [
    flatten({ x: boxMin, y: boxMin, z: boxMax }),
    flatten({ x: boxMax, y: boxMin, z: boxMax }),
    flatten({ x: boxMax, y: boxMax, z: boxMax }),
    flatten({ x: boxMin, y: boxMax, z: boxMax }),
  ],
  "none",
  "#800080"
);
*/

(window as any).walls = { top, bottom, left, right, /*front,*/ back };

/**
 *
 * @param center Where to draw the ball.
 * @param splat Draw a special effect to signify that the ball is pressed against the near wall.
 * @returns The element for the ball.
 * It has already been added to the `<svg>`.
 * But you can save this so you can remove it later.
 */
function makeBall(center: Point3, splat = false) {
  const diameter = (splat ? 2.5 : 1) * ballRadius * flattenRatio(center.z) * 2;
  const [x, y] = flatten(center);
  const main = roughSvg.circle(x, y, diameter, {
    fill: /*splat ? "#ff5050" : */ "#ffa0a0",
    stroke: "none",
    strokeWidth: 0.2,
    disableMultiStroke: true,
    fillStyle: "solid",
    roughness: splat ? 1 : 0.3333,
    curveStepCount: splat ? 50 : 9,
    // curveStepCount:3 looks a lot like a triangle, sorta
    //curveStepCount:99 looks like a paintball hit something.
  });
  svgForeground.appendChild(main);
  return main;
}

const ballPosition: Point3 = {
  x: Math.random() * ballRange + ballMin,
  y: Math.random() * ballRange + ballMin,
  z: Math.random() * ballRange + ballMin,
};
const ballVelocity = {
  x: Math.random() * 50 - 25,
  y: Math.random() * 50 - 25,
  z: Math.random() * 50 - 25,
};
//ballVelocity.x = ballVelocity.y = ballVelocity.z = 0;
let lastBallUpdate: number | undefined;

/**
 * When should we redraw the ball?  We could do it every animation frame, but that doesn't look good.
 *
 * This value should be consistent with `performance.now()` or a callback from `requestAnimationFrame()`.
 */
let redrawBallAfter = -Infinity;

const whack = getById("whack", HTMLAudioElement);

// In order for the build step to find this *.mp3 file I had to do both of these things.
// 1) I had to do the url import in this TypeScript file.
//    Vite didn't do this if I set the set the src property in the HTML file.
// 2) I had to update vite.config.ts to include *.mp3 files.
whack.src = whackUrl;

/**
 * @param z The current z position of the ball.
 * @returns The desired volume.
 */
const whackVolume : (z : number) => number = makeLinear(ballMax, 1, ballMin, 0.25);

/**
 * Use this to set the left/right balance.
 */
const setWhackBalance = getAudioBalanceControl(whack);

/**
 * This will give you a good value for the left/right balance.
 */
const whackBalance = makeLinear(ballMin, -1, ballMax, 1);

/**
 * Update ballPosition and ballVelocity based on the amount of time passed since the previous update.
 *
 * If the ball hits a wall, notify the corresponding wall object.
 * This can also change `showSmashedBallNextTime` and `redrawBallAfter`.
 *
 * Assume that `Wall.timerUpdate()` will be called shortly after this.
 * @param time From `performance.now()` or a callback from `requestAnimationFrame()`.
 */
function updateBall(time: DOMHighResTimeStamp) {
  /**
   * Actions common to all walls:
   * * Plays a sound.
   * * Draw the ball immediately.  This is a key frame that we have to display.
   * Be sure to call this *after* updating ballPosition.
   */
  const hitAWall = () => {
    try {
      whack.pause();
      whack.currentTime = 0;
      whack.volume = whackVolume(ballPosition.z);
      setWhackBalance(whackBalance(ballPosition.x));
      whack.play();  
    } catch (reason) {
      console.warn("Unable to do audio stuff", reason);
      // Interesting.  I often see this message:
      // Uncaught (in promise) DOMException: The play() request was interrupted by a call to pause(). https://goo.gl/LdLk22
      // This seems innocuous.
    }
    // Redraw the ball ASAP.
    redrawBallAfter = -Infinity;
  }
  if (lastBallUpdate !== undefined) {
    const secondsPassed = (time - lastBallUpdate) / 1000;
    if (secondsPassed <= 0) {
      // Do NOT update lastBallUpdate.  Do not do anything.
      // The logic for bouncing might not work well in reverse.
      return;
    }
    ballPosition.x += ballVelocity.x * secondsPassed;
    if (ballPosition.x < ballMin) {
      ballPosition.x = ballMin;
      ballVelocity.x = Math.abs(ballVelocity.x);
      //left.refresh();
      left.highlightPoint(ballPosition, time);
      hitAWall();
    } else if (ballPosition.x > ballMax) {
      ballPosition.x = ballMax;
      ballVelocity.x = -Math.abs(ballVelocity.x);
      //right.refresh();
      right.highlightPoint(ballPosition, time);
      hitAWall();
    }
    ballPosition.y += ballVelocity.y * secondsPassed;
    if (ballPosition.y < ballMin) {
      ballPosition.y = ballMin;
      ballVelocity.y = Math.abs(ballVelocity.y);
      //bottom.refresh();
      bottom.highlightPoint(ballPosition, time);
      hitAWall();
    } else if (ballPosition.y > ballMax) {
      ballPosition.y = ballMax;
      ballVelocity.y = -Math.abs(ballVelocity.y);
      //top.refresh();
      top.highlightPoint(ballPosition, time);
      hitAWall();
    }
    ballPosition.z += ballVelocity.z * secondsPassed;
    if (ballPosition.z < ballMin) {
      ballPosition.z = ballMin;
      ballVelocity.z = Math.abs(ballVelocity.z);
      //back.refresh();
      back.highlightPoint(ballPosition, time);
      hitAWall();
    } else if (ballPosition.z > ballMax) {
      ballPosition.z = ballMax;
      ballVelocity.z = -Math.abs(ballVelocity.z);
      showSmashedBallNextTime = true;
      hitAWall();
    }
  }
  lastBallUpdate = time;
}

let showSmashedBallNextTime = false;

let ballSvg: SVGElement | undefined;

function fade(element: SVGElement) {
  element.classList.add("fade");
  setTimeout(() => element.remove(), 500);
}

function animate(time: DOMHighResTimeStamp) {
  requestAnimationFrame(animate);
  updateBall(time);
  if (time > redrawBallAfter) {
    if (ballSvg) {
      fade(ballSvg);
      ballSvg = undefined;
    }
    ballSvg = makeBall(ballPosition, showSmashedBallNextTime);
    showSmashedBallNextTime = false;
    svgForeground.appendChild(ballSvg);
    redrawBallAfter = time + 100 + Math.random() * 100;
  }
  Wall.timerUpdate(time);
}
requestAnimationFrame(animate);
