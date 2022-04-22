import "./style.css";

import rough from "roughjs";
import { getById } from "./lib/client-misc";
import { Point } from "roughjs/bin/geometry";
import { Options } from "roughjs/bin/core";

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

type LinearFunction = (x: number) => number;

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

const screenMin = 1;
const screenMax = 99;
const screenSize = screenMax - screenMin;

/**
 * Scale a length on the screen to simulate depth.
 * @param z The z value at or near what we are measuring.
 * Negative values go from the user toward the screen.
 * Positive values go from the screen toward the user.
 * @returns A ratio.  This will be 1 for things that are on the close face of the box.
 * This will be smaller for things that are further away.
 */
const flattenRatio = makeLinear(boxMax, 1, boxMin, 0.5);

function flatten({ x, y, z }: Point3): Point {
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

function wallOptions(color: string): Options {
  return {
    stroke: "none",
    fill: color,
    fillStyle: "zigzag",
    hachureGap: 5,
    disableMultiStrokeFill: true,
    hachureAngle: Math.random() * 360,
    //preserveVertices: true,
  };
}

const left = roughSvg.polygon(
  [
    flatten({ x: boxMin, y: boxMin, z: boxMin }),
    flatten({ x: boxMin, y: boxMax, z: boxMin }),
    flatten({ x: boxMin, y: boxMax, z: boxMax }),
    flatten({ x: boxMin, y: boxMin, z: boxMax }),
  ],
  wallOptions("#008000")
);
svgBackground.appendChild(left);

const right = roughSvg.polygon(
  [
    flatten({ x: boxMax, y: boxMin, z: boxMin }),
    flatten({ x: boxMax, y: boxMax, z: boxMin }),
    flatten({ x: boxMax, y: boxMax, z: boxMax }),
    flatten({ x: boxMax, y: boxMin, z: boxMax }),
  ],
  wallOptions("#000080")
);
svgBackground.appendChild(right);

const top = roughSvg.polygon(
  [
    flatten({ x: boxMin, y: boxMax, z: boxMin }),
    flatten({ x: boxMax, y: boxMax, z: boxMin }),
    flatten({ x: boxMax, y: boxMax, z: boxMax }),
    flatten({ x: boxMin, y: boxMax, z: boxMax }),
  ],
  wallOptions("#808000")
);
svgBackground.appendChild(top);

const bottom = roughSvg.polygon(
  [
    flatten({ x: boxMin, y: boxMin, z: boxMin }),
    flatten({ x: boxMax, y: boxMin, z: boxMin }),
    flatten({ x: boxMax, y: boxMin, z: boxMax }),
    flatten({ x: boxMin, y: boxMin, z: boxMax }),
  ],
  wallOptions("#008080")
);
svgBackground.appendChild(bottom);

const back = roughSvg.polygon(
  [
    flatten({ x: boxMin, y: boxMin, z: boxMin }),
    flatten({ x: boxMax, y: boxMin, z: boxMin }),
    flatten({ x: boxMax, y: boxMax, z: boxMin }),
    flatten({ x: boxMin, y: boxMax, z: boxMin }),
  ],
  wallOptions("#800000")
);
svgBackground.appendChild(back);

//const y = roughSvg.polygon([[5, 5], [5, 95], [95, 95],[95, 5]]);
//svgBackground.appendChild(y)

function makeBall(center: Point3) {
  const diameter = ballRadius * flattenRatio(center.z) * 2;
  const [x, y] = flatten(center);
  const main = roughSvg.circle(x, y, diameter, {
    fill: "#ffa0a0",
    stroke: "none",
    strokeWidth: 0.2,
    disableMultiStroke: true,
    fillStyle: "solid",
    roughness:0.3333,
    // curveStepCount:3 looks a lot like a triangle, sorta
    //curveStepCount:99 looks like a paintball hit something.  
  });
  svgForeground.appendChild(main);
  return main;
}

/*
(window as any).makeBall = makeBall;
const numberOfBalls = 5;
const positionMaker = makeLinear(0, ballMin, numberOfBalls - 1, ballMax);
for (let i = 0; i < numberOfBalls; i++) {
  const position = positionMaker(i);
  makeBall({ x: position, y: position, z: position });
}
*/

const ballPosition : Point3 = { x: Math.random() * ballRange + ballMin, y: Math.random() * ballRange + ballMin, z: Math.random() * ballRange + ballMin,  };
const ballVelocity = {
  x: Math.random() * 100 - 50,
  y: Math.random() * 100 - 50,
  z: Math.random() * 100 - 50,
};
let lastBallUpdate: number | undefined;

function updateBall(time: DOMHighResTimeStamp) {
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
    } else if (ballPosition.x > ballMax) {
      ballPosition.x = ballMax;
      ballVelocity.x = -Math.abs(ballVelocity.x);
    }
    ballPosition.y += ballVelocity.y * secondsPassed;
    if (ballPosition.y < ballMin) {
      ballPosition.y = ballMin;
      ballVelocity.y = Math.abs(ballVelocity.y);
    } else if (ballPosition.y > ballMax) {
      ballPosition.y = ballMax;
      ballVelocity.y = -Math.abs(ballVelocity.y);
    }
    ballPosition.z += ballVelocity.z * secondsPassed;
    if (ballPosition.z < ballMin) {
      ballPosition.z = ballMin;
      ballVelocity.z = Math.abs(ballVelocity.z);
    } else if (ballPosition.z > ballMax) {
      ballPosition.z = ballMax;
      ballVelocity.z = -Math.abs(ballVelocity.z);
    }
  }
  lastBallUpdate = time;
}

let ballSvg : SVGElement | undefined;

function animate(time: DOMHighResTimeStamp) {
  if (ballSvg) {
    ballSvg.remove();
    ballSvg = undefined;
  }
  requestAnimationFrame(animate);
  updateBall(time);
  ballSvg = makeBall(ballPosition);
  svgForeground.appendChild(ballSvg);
}
requestAnimationFrame(animate);
