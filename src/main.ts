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

function midpoint(a: Point, b: Point): Point {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function interpolate(from: Point, to: Point, fromRatio: number): Point {
  const toRatio = 1 - fromRatio;
  return [
    from[0] * fromRatio + to[0] * toRatio,
    from[1] * fromRatio + to[1] * toRatio,
  ];
}

class Wall {
  private static options(color: string): Options {
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
  #element: SVGElement | undefined;
  constructor(
    private readonly points: Point[],
    private readonly color: string
  ) {
    if (points.length != 4) {
      throw new Error("wtf");
    }
    this.refresh();
  }
  private clear() {
    if (this.#element) {
      this.#element.remove();
    }
    this.#element = undefined;
  }
  refresh() {
    this.clear();
    this.#element = roughSvg.polygon(this.points, Wall.options(this.color));
    svgBackground.appendChild(this.#element);
  }
  highlightPointXX(toHighlight: Point3) {
    this.clear();
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const toHighlight2 = flatten(toHighlight);
    this.points.forEach((point, index) => {
      const nextPoint = this.points[(index + 1) % 4];
      const [hachureAngle, stroke] = index % 2 ? [90, this.color] : [0, "none"];
      const triangle = roughSvg.polygon([point, nextPoint, toHighlight2], {
        ...Wall.options(this.color),
        hachureAngle,
        //stroke,
        //strokeWidth: 0.25,
        //fillWeight: 0.5
      });
      group.appendChild(triangle);
    });
    this.#element = group;
    svgBackground.appendChild(group);
  }
  highlightPointX(toHighlight: Point3) {
    this.clear();
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const toHighlight2 = flatten(toHighlight);
    this.points.forEach((previousPoint, index) => {
      const point = this.points[(index + 1) % 4];
      const nextPoint = this.points[(index + 2) % 4];
      const [hachureAngle, stroke] = index % 2 ? [90, this.color] : [0, "none"];
      const polygon = roughSvg.polygon(
        [
          point,
          midpoint(point, nextPoint),
          toHighlight2,
          midpoint(point, previousPoint),
        ],
        { ...Wall.options(this.color), hachureAngle, stroke, strokeWidth: 0.5 }
      );
      group.appendChild(polygon);
    });
    this.#element = group;
    svgBackground.appendChild(group);
  }
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
    let lastUpdate = -Infinity;
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
    };
    const bounceAction = (time: DOMHighResTimeStamp) => {
      if (time < lastUpdate + 150) {
        return;
      }
      lastUpdate = time;
      if (bounce) {
        bounce.remove();
        bounce = undefined;
      }
      if (time > endTime) {
        Wall.#timerUpdate.delete(this);
      } else {
        const currentSize = size(time);
        if ((!isFinite(currentSize)) || (currentSize < 0) || (currentSize > 1)) {
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

function makeBall(center: Point3) {
  const diameter = ballRadius * flattenRatio(center.z) * 2;
  const [x, y] = flatten(center);
  const main = roughSvg.circle(x, y, diameter, {
    fill: "#ffa0a0",
    stroke: "none",
    strokeWidth: 0.2,
    disableMultiStroke: true,
    fillStyle: "solid",
    roughness: 0.3333,
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
      //left.refresh();
      left.highlightPoint(ballPosition, time);
    } else if (ballPosition.x > ballMax) {
      ballPosition.x = ballMax;
      ballVelocity.x = -Math.abs(ballVelocity.x);
      //right.refresh();
      right.highlightPoint(ballPosition, time);
    }
    ballPosition.y += ballVelocity.y * secondsPassed;
    if (ballPosition.y < ballMin) {
      ballPosition.y = ballMin;
      ballVelocity.y = Math.abs(ballVelocity.y);
      //bottom.refresh();
      bottom.highlightPoint(ballPosition, time);
    } else if (ballPosition.y > ballMax) {
      ballPosition.y = ballMax;
      ballVelocity.y = -Math.abs(ballVelocity.y);
      //top.refresh();
      top.highlightPoint(ballPosition, time);
    }
    ballPosition.z += ballVelocity.z * secondsPassed;
    if (ballPosition.z < ballMin) {
      ballPosition.z = ballMin;
      ballVelocity.z = Math.abs(ballVelocity.z);
      //back.refresh();
      back.highlightPoint(ballPosition, time);
    } else if (ballPosition.z > ballMax) {
      ballPosition.z = ballMax;
      ballVelocity.z = -Math.abs(ballVelocity.z);
      // TODO add a splat image on the glass or something like that.
    }
  }
  lastBallUpdate = time;
}

let ballSvg: SVGElement | undefined;

function animate(time: DOMHighResTimeStamp) {
  if (ballSvg) {
    ballSvg.remove();
    ballSvg = undefined;
  }
  requestAnimationFrame(animate);
  updateBall(time);
  ballSvg = makeBall(ballPosition);
  svgForeground.appendChild(ballSvg);
  Wall.timerUpdate(time);
}
requestAnimationFrame(animate);
