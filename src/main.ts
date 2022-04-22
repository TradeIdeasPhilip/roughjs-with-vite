import "./style.css";

import rough from "roughjs";
import { getById } from "./lib/client-misc";
import { Point } from "roughjs/bin/geometry";
import { Options } from "roughjs/bin/core";

const rc = rough.canvas(document.getElementById("canvas") as HTMLCanvasElement);

function test0() {
  rc.rectangle(10, 10, 200, 200); // x, y, width, height
}

function test1() {
  rc.circle(80, 120, 50); // centerX, centerY, diameter
  rc.ellipse(300, 100, 150, 80); // centerX, centerY, width, height
  rc.line(80, 120, 300, 100); // x1, y1, x2, y2
}

function test2() {
  rc.circle(50, 50, 80, { fill: "red" }); // fill with red hachure
  rc.rectangle(120, 15, 80, 80, { fill: "red" });
  rc.circle(50, 150, 80, {
    fill: "rgb(10,150,10)",
    fillWeight: 3, // thicker lines for hachure
  });
}

function test3() {
  rc.rectangle(220, 15, 80, 80, {
    fill: "red",
    hachureAngle: 60, // angle of hachure,
    hachureGap: 8,
  });
  rc.rectangle(120, 105, 80, 80, {
    fill: "rgba(255,0,200,0.2)",
    fillStyle: "solid", // solid fill
  });
}
/*
hachure draws sketchy parallel lines with the same roughness as defined by the roughness and the bowing properties of the shape. It can be further configured using the fillWeight, hachureAngle, and hachureGap properties.
solid is more like a conventional fill.
zigzag draws zig-zag lines filling the shape
cross-hatch Similar to hachure, but draws cross hatch lines (akin to two hachure fills 90 degrees from each other).
dots Fills the shape with sketchy dots.
dashed Similar to hachure but the individual lines are dashed. Dashes can be configured using the dashOffset and dashGap properties.
zigzag-line Similar to hachure but individual lines are drawn in a zig-zag fashion. The size of the zig-zag can be configured using the zigzagOffset property
*/
rc.rectangle(10, 20, 200, 200, {
  fill: "red",
  roughness: 3,
  hachureGap: 30,
  fillStyle: "zigzag",
  disableMultiStroke: false,
  disableMultiStrokeFill: true,
  fillWeight: 1,
  curveFitting: 1,
});

// I copied these somewhat arbitrary dimensions from https://github.com/TradeIdeasPhilip/bounce-3d/blob/master/src/main.ts
// so I wouldn't have to start from scratch.
const boxMax = 14;
const boxMin = -boxMax;
const boxSize = boxMax - boxMin;
const ballRadius = 0.5;
// The _center_ of the ball can _not_ go all the way to the wall.
// Always reserve one ball radius.
const ballMin = boxMin + ballRadius;
const ballMax = boxMax - ballRadius;

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

