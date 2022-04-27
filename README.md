# Fun with crayons, 3d-ish graphics, and TypeScript
## Purpose
Just trying a few things.

I'm making a ball bounce inside a cube.
It's a toy problem.
It's fun and pretty, but the point was to learn some new tools.

## See it live
[See this live in your browser](https://tradeideasphilip.github.io/roughjs-with-vite/)
I've mostly tested this with Chrome.
I'm having trouble with the sound under Safari, but otherwise the code seems to work fine.

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

I've considered getting rid of most calls to `Window.requestAnimationFrame()` because some of these effects are so slow relative to the browser's frame rate.

### The ball uses similar tricks.
I love the way the ball looks when it's paused.
Originally the ball looked blurry because the program was updating it at 60 FPS.
Redoing the randomness _and_ moving the ball _both_ make it hard to see the details of the ball.

Like the marks on the wall, I purposely slow down the frame rate.
I draw a new ball after a pause of no less than 100 milliseconds.
The exact value is chosen randomly for each frame.

The old balls fade away.
About 3 or 4 will be still visible at any time.
Each one is usually distinct, i.e. they don't usually overlap.
I added this effect to enhance the illusion of motion, to make up for the slow frame rate.

The fading effect works even better than I expected.
Before I added the fading, the slow framerate made everything jerky.
The illusion of 3d motion still worked, and I could see the balls clearly, but it looked jerky.

The trail of fading balls makes the slow framerate more obvious, but at the same time it looks better.
It's more pleasant, less jarring.
Also, you can see the ball for longer, so you can appreciate the details more.

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