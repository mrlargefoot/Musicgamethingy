import * as Tone from 'https://cdn.skypack.dev/tone';



const numCircles = 10;

const circles = Array.from({ length: numCircles }, () => {
  const div = document.createElement('div');
  div.className = 'circle';
  document.body.appendChild(div);
  return {
    div,
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    dx: (Math.random() - 0.5) * 2,
    dy: (Math.random() - 0.5) * 2,
    targetX: null,
    targetY: null,
    gridX: null,
    gridY: null,
    note: null,
    playing: false,
  };
});

// Create the filter, reverb, and synth
const filter = new Tone.Filter();
const reverb = new Tone.Reverb(1).toDestination();
const synth = new Tone.PolySynth(Tone.Synth, {
  oscillator: {
    type: 'pulse',
  },
  envelope: {
    attack: 0.01,
    release: 0.01
  }
}).connect(filter).connect(reverb);



const gridWidth = 12;
const gridHeight = 12;
const notes = ['C', 'D', 'G', 'A#'];
const grid = Array.from({ length: gridWidth }, (_, x) =>
  Array.from({ length: gridHeight }, (_, y) => ({
    note: notes[x % notes.length] + (Math.floor(x / notes.length) + 3),
    volume: -30 + (30 / gridHeight) * y,
  }))
);

const gridContainer = document.querySelector('#grid-container');
for(let i=0; i<gridHeight; i++) {
  for(let j=0; j<gridWidth; j++) {
    const gridCell = document.createElement('div');
    gridCell.id = `grid-cell-${i}-${j}`;
    gridCell.className = 'grid-cell';
    gridContainer.appendChild(gridCell);
  }
}



let lastClickedX = window.innerWidth / 2;
let lastClickedY = window.innerHeight / 2;

const randomMotionFactor = 0.05;
const shoalingSpeed = 0.2;
const cursorSpeed = 1;

const shoalingSpeedLimit = 2;
const schoolingSpeedLimit = 10;

const decelerationRate = 20;


function moveCircles() {
  for (let circle of circles) {
    if (circle.targetX !== null && circle.targetY !== null) {
      const dx = circle.targetX - circle.x;
      const dy = circle.targetY - circle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const speedFactor = 1 - Math.max(0, (decelerationRate - distance) / decelerationRate);

      circle.dx += dx * cursorSpeed * speedFactor;
      circle.dy += dy * cursorSpeed * speedFactor;

      const speed = Math.sqrt(circle.dx * circle.dx + circle.dy * circle.dy);
      if (speed > schoolingSpeedLimit) {
        circle.dx /= speed / schoolingSpeedLimit;
        circle.dy /= speed / schoolingSpeedLimit;
      }
    }

    if (circle.targetX === null && circle.targetY === null) {
      circle.dx += Math.sin(circle.dx) * randomMotionFactor;
      circle.dy += Math.sin(circle.dy) * randomMotionFactor;

      const centerDx = lastClickedX - circle.x;
      const centerDy = lastClickedY - circle.y;
      const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
      if (centerDistance > 200) {
        circle.dx += centerDx * 0.001 * shoalingSpeed;
        circle.dy += centerDy * 0.001 * shoalingSpeed;
      }

      if (circle.x < 50) circle.dx += 0.1;
      if (circle.y < 50) circle.dy += 0.1;
      if (circle.x > window.innerWidth - 50) circle.dx -= 0.1;
      if (circle.y > window.innerHeight - 50) circle.dy -= 0.1;

      const speed = Math.sqrt(circle.dx * circle.dx + circle.dy * circle.dy);
      if (speed > shoalingSpeedLimit) {
        circle.dx /= speed / shoalingSpeedLimit;
        circle.dy /= speed / shoalingSpeedLimit;
      }

      for (let otherCircle of circles) {
        if (otherCircle === circle) continue;
        const dx = otherCircle.x - circle.x;
        const dy = otherCircle.y - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 50) {
          circle.dx -= dx * 0.01;
          circle.dy -= dy * 0.01;
        }
      }
    }

    

    circle.x += circle.dx;
    circle.y += circle.dy;

    circle.div.style.left = `${circle.x}px`;
    circle.div.style.top = `${circle.y}px`;

    const gridContainerRect = gridContainer.getBoundingClientRect();
    const gridY = Math.floor((circle.x - gridContainerRect.left) / (gridContainerRect.width / gridWidth));
    const gridX = Math.floor((circle.y - gridContainerRect.top) / (gridContainerRect.height / gridHeight));


    if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
      if (gridX !== circle.gridX || gridY !== circle.gridY) {
        // If the circle moved to a different cell, change the old cell's color back to black
        if (circle.gridX !== null && circle.gridY !== null) {
          document.getElementById(`grid-cell-${circle.gridX}-${circle.gridY}`).classList.remove('active');
        }

        circle.gridX = gridX;
        circle.gridY = gridY;

        // Change the new cell's color to white
        document.getElementById(`grid-cell-${gridX}-${gridY}`).classList.add('active');

        const { note, volume } = grid[gridY][gridX];
        if (circle.note) {
            //console.log(`Releasing note ${circle.note} for circle ${circle}`);
            synth.triggerRelease(circle.note);
        }
        if (Math.random() < 0.3) { // This line makes note triggering happen 50% of the time.
            /*console.log(`Triggering note ${note} for circle ${circle}`);*/
            synth.triggerAttackRelease(note, "4n", undefined, Math.random());

            circle.note = note;
        }
        filter.frequency.value = 200 + (gridY / gridHeight) * 10000; // This line adjusts the filter cutoff based on the Y axis.
      }
    }

    
  }

  requestAnimationFrame(moveCircles);
}

moveCircles();

document.addEventListener('mousedown', (event) => {
  for (let circle of circles) {
    circle.targetX = event.clientX;
    circle.targetY = event.clientY;
  }
  lastClickedX = event.clientX;
  lastClickedY = event.clientY;
  Tone.start();  // Start audio context after a user action.
});

document.addEventListener('mousemove', (event) => {
  if (event.buttons !== 1) return;

  for (let circle of circles) {
    circle.targetX = event.clientX;
    circle.targetY = event.clientY;
  }
  lastClickedX = event.clientX;
  lastClickedY = event.clientY;
});

document.addEventListener('mouseup', () => {
  setTimeout(() => {
    for (let circle of circles) {
      circle.targetX = null;
      circle.targetY = null;
    }
  }, 500);
});
