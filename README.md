# Purpose
Just trying a few things.

I'm making a ball bounce inside a cube.
It's a toy problem.
It's fun and pretty, but the point was to learn some new tools.

[See this live in your browser](https://tradeideasphilip.github.io/roughjs-with-vite/)
# Vite
 https://vitejs.dev/

 Consider running
 * `npm run dev`
 * or `npm run build`

# Rough.js
https://roughjs.com/

Fun graphics!

# Lessons learned

## Build tool / packages and modules

Vite was the best, easiest way to access Rough.js.

I tried the CDN approach, but that broke TypeScript.

Vite sits on top of other build tools.
I looked at using those directly, but that would be more complicated.

Vite covers all the issues of packages and modules.
I used npm to install vite and Rough.js.
I used modern ES6 JavaScript `import` and `export` statements in my code.
End of story.

## Graphics library

Rough.js was easy to use (once I got past the packages/modules/TypeScript issues).
The results look great.
I wish I knew what to draw next!

## Performance

It's amazing how much I can do in 4k at 60hz on my old laptop or my old android phone, in JavaScript!

Rough.js creates long and complicated paths.
I was able to animate a lot of updates completely smoothly.

## Slowing things down / Making things look good

You can animate complicated Rough.js patterns at 60 FPS.
But it typically doesn't look good.

If you have a solid shape and the edges are _rough_, you see a small solid shape surrounded by a blur.
If you have a lot of lines or points, they are barely visible at all.

### The best things I did involved slowing down the updates.
The walls only change when an event happens.
I looked at several ways to add more animation, but none looked good.

### The marks on the walls are a little more animated.
But they never change at more than 10 fps.

Sometimes they go slower.
A random number generator controls the display time for each frame.
This looks better than a fixed frame rate.

I've considered getting rid of any calls to `Window.requestAnimationFrame()` because some of these effects are so slow relative to the browser's frame rate.


### The ball needs similar tricks.
I love the way the ball looks when it's paused.
Redoing the randomness and moving the ball both make it hard to see the details of the ball.
Basically  I just see a blur in the right general position and size.

A simple solution would be to update the ball every 100 (plus some random number) milliseconds.
I want to try that.

But I can do better.
There are a lot of tricks to make things look like they are in motion.
I can draw the main image clearly, then add my own blur.

Fading works really well at 60 FPS, so why not (a) draw the ball at the new position instantly while (b) letting the previous drawings of the ball fade gradually?

### The 60 FPS hierarchy:
* Fades are subtle effects.
  * They don't call attention to themselves.
  * The item is **clear** and focused until it is really faded.
* Smoothly moving across the screen causes blur.
  * The item can be hard to see unless it's moving very slowly.
  * It doesn't look attractive and it doesn't look real.
* Refreshing a Rough.js item is not recommended at 60 fps.
  * There is a huge change between one frame and the next.
  * The image is instantly unrecognizable.

### Lots of things are changing at once.
Each part of the image of the image needs to stay fixed for at least 100ms.
But each part can update itself at different times, so the entire image never stays fixed.

Adding some randomness to the frame rate of the individual flashes also helped.
The final result looks alive.
But the individual pieces are clear and easy to see.

## Detail

The bad part of the Rough.js style is that I could never get as much detail as I wanted.

Sometimes I tried making patterns.
I tried breaking a wall up into 4 smaller rectangles.
Each was drawn at a different angle, trying to make a pattern.
But the pattern was basically unnoticeable.
I tried various settings to turn down the randomness.
That only helped if I turned them way down, to the point where the picture wasn't interesting any more.
I could _not_ find a happy medium.

Sometimes adding a stroke (or only using a stroke) will give you more precision than using a fill.
No strokes appear in this project, because it didn't match the style that I was going for.
But the stroke often looked good and I'll consider it for other projects.
Especially when I want to show a lot of detail.