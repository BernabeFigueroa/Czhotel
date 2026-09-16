import React, { useEffect, useState } from 'react';

interface LiveTimerProps {
  startTimeIso: string;
}

export const LiveTimer: React.FC<LiveTimerProps> = ({ startTimeIso }) => {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    const updateTimer = () => {
      const startMs = new Date(startTimeIso).getTime();
      const nowMs = Date.now();
      const diffSecs = Math.max(0, Math.floor((nowMs - startMs) / 1000));

      const hours = Math.floor(diffSecs / 3600);
      const minutes = Math.floor((diffSecs % 3600) / 60);
      const seconds = diffSecs % 60;

      const pad = (n: number) => n.toString().padStart(2, '0');
      setElapsed(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTimeIso]);

  return (
    <span className="font-mono text-4xl sm:text-5xl font-black tracking-tight text-rose-950 block tabular-nums">
      {elapsed}
    </span>
  );
};
