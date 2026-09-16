/**
 * Snake — a small game page for the Horizon portal.
 *
 * Registered under Apps by App.tsx. Layout and controls come from the host kit
 * (`ui`), so the page matches Horizon; the board is a <canvas> that picks its
 * colors from the host's live light/dark theme.
 *
 * Controls: arrow keys or WASD to steer, Space to start / pause / restart.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHorizonContext } from '@netsapiens/horizon-sdk';

const GRID = 20; // cells per side
const CELL = 20; // pixels per cell
const SIZE = GRID * CELL;

type Point = { x: number; y: number };
type Status = 'ready' | 'playing' | 'paused' | 'over';

const UP: Point = { x: 0, y: -1 };
const DOWN: Point = { x: 0, y: 1 };
const LEFT: Point = { x: -1, y: 0 };
const RIGHT: Point = { x: 1, y: 0 };

const KEY_DIRS: Record<string, Point> = {
  ArrowUp: UP,
  ArrowDown: DOWN,
  ArrowLeft: LEFT,
  ArrowRight: RIGHT,
  w: UP,
  s: DOWN,
  a: LEFT,
  d: RIGHT,
};

function startingSnake(): Point[] {
  return [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
}

function randomFood(snake: Point[]): Point {
  while (true) {
    const p = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

/** Gets faster every 5 points, down to a floor. */
function speedFor(score: number): number {
  return Math.max(60, 140 - Math.floor(score / 5) * 10);
}

export default function SnakeGamePage() {
  const { ui, theme } = useHorizonContext();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snakeRef = useRef<Point[]>(startingSnake());
  const dirRef = useRef<Point>(RIGHT);
  const nextDirRef = useRef<Point>(RIGHT);
  const foodRef = useRef<Point>(randomFood(snakeRef.current));

  const [status, setStatus] = useState<Status>('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const statusRef = useRef<Status>(status);
  statusRef.current = status;

  const isDark = theme === 'dark';

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const colors = isDark
      ? { bg: '#15191c', grid: '#22282d', body: '#43a047', head: '#81c784', food: '#ef5350' }
      : { bg: '#f4f6f8', grid: '#e3e7eb', body: '#2e7d32', head: '#66bb6a', food: '#e53935' };

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL + 0.5, 0);
      ctx.lineTo(i * CELL + 0.5, SIZE);
      ctx.moveTo(0, i * CELL + 0.5);
      ctx.lineTo(SIZE, i * CELL + 0.5);
      ctx.stroke();
    }

    const food = foodRef.current;
    ctx.fillStyle = colors.food;
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
    ctx.fill();

    snakeRef.current.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? colors.head : colors.body;
      ctx.fillRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4);
    });
  }, [isDark]);

  // Redraw whenever the theme flips.
  useEffect(() => {
    draw();
  }, [draw]);

  // Track the session best separately, rather than nesting a second state
  // update inside the score updater.
  useEffect(() => {
    setBest((b) => Math.max(b, score));
  }, [score]);

  const reset = useCallback(() => {
    snakeRef.current = startingSnake();
    dirRef.current = RIGHT;
    nextDirRef.current = RIGHT;
    foodRef.current = randomFood(snakeRef.current);
    setScore(0);
  }, []);

  const primaryAction = useCallback(() => {
    const s = statusRef.current;
    if (s === 'playing') setStatus('paused');
    else if (s === 'paused') setStatus('playing');
    else {
      reset();
      setStatus('playing');
    }
  }, [reset]);

  const steer = useCallback((d: Point) => {
    const cur = dirRef.current;
    // No reversing straight into yourself.
    if (cur.x + d.x === 0 && cur.y + d.y === 0) return;
    nextDirRef.current = d;
  }, []);

  // Game loop — restarts when speed changes.
  const speed = speedFor(score);
  useEffect(() => {
    if (status !== 'playing') return;

    const id = window.setInterval(() => {
      dirRef.current = nextDirRef.current;
      const snake = snakeRef.current;
      const head = { x: snake[0].x + dirRef.current.x, y: snake[0].y + dirRef.current.y };
      const eating = head.x === foodRef.current.x && head.y === foodRef.current.y;

      const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
      // The tail moves away this tick unless we're eating, so it doesn't count.
      const body = eating ? snake : snake.slice(0, -1);
      const hitSelf = body.some((s) => s.x === head.x && s.y === head.y);

      if (hitWall || hitSelf) {
        setStatus('over');
        return;
      }

      const next = [head, ...snake];
      if (eating) {
        foodRef.current = randomFood(next);
        setScore((n) => n + 1);
      } else {
        next.pop();
      }
      snakeRef.current = next;
      draw();
    }, speed);

    return () => window.clearInterval(id);
  }, [status, speed, draw]);

  // Keyboard controls. Ignored while typing in any portal input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === ' ') {
        e.preventDefault();
        primaryAction();
        return;
      }
      const d = KEY_DIRS[key];
      if (d && statusRef.current === 'playing') {
        e.preventDefault(); // keep arrows from scrolling the portal
        steer(d);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [primaryAction, steer]);

  const PageTemplate = ui?.templates?.PageTemplate;
  const { Paper, Stack, Box, Typography, Button } = ui || {};

  const actionLabel =
    status === 'playing' ? 'Pause' : status === 'paused' ? 'Resume' : status === 'over' ? 'Play again' : 'Start';

  const message =
    status === 'ready'
      ? 'Press Space or Start. Steer with arrow keys or WASD.'
      : status === 'paused'
        ? 'Paused'
        : status === 'over'
          ? `Game over! You scored ${score}.`
          : 'Eat the red dots. Don’t hit the walls or yourself.';

  const board = (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      style={{ width: '100%', maxWidth: SIZE, aspectRatio: '1 / 1', display: 'block', borderRadius: 8 }}
    />
  );

  // Fallback if the host kit isn't available.
  if (!PageTemplate || !Paper || !Stack || !Box || !Typography || !Button) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Snake</h1>
        <p>Score: {score} · Best: {best}</p>
        {board}
        <button onClick={primaryAction}>{actionLabel}</button>
      </div>
    );
  }

  // A plain function, not a component: defining a component inside render
  // gives it a new identity every time and remounts the buttons on each tick.
  const pad = (label: string, dir: Point) => (
    <Button
      variant='outlined'
      size='small'
      onClick={() => steer(dir)}
      sx={{ minWidth: 48 }}
    >
      {label}
    </Button>
  );

  return (
    <PageTemplate
      title='Snake'
      subtitle='A little break from the phones'
      breadcrumbs={[{ label: 'Apps', url: '/apps' }, { label: 'Snake' }]}
    >
      <Paper variant='outlined' sx={{ p: 3, maxWidth: SIZE + 48 }}>
        <Stack spacing={2}>
          <Stack direction='row' justifyContent='space-between' alignItems='center'>
            <Box>
              <Typography variant='h6' fontWeight={600}>
                Score: {score}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Best this session: {best}
              </Typography>
            </Box>
            <Button variant='contained' onClick={primaryAction}>
              {actionLabel}
            </Button>
          </Stack>

          {board}

          <Typography variant='body2' color='text.secondary'>
            {message}
          </Typography>

          {/* On-screen pad for touch devices */}
          <Stack alignItems='center' spacing={1}>
            {pad('▲', UP)}
            <Stack direction='row' spacing={1}>
              {pad('◀', LEFT)}
              {pad('▼', DOWN)}
              {pad('▶', RIGHT)}
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </PageTemplate>
  );
}
