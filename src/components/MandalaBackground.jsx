import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

const getPolygonPoints = (sides, radius, cx = 200, cy = 200) => {
  const points = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
};

export default function MandalaBackground({ currentIndex }) {
  // Base style for very thin strokes and low opacity
  const baseStroke = "stroke-slate-400/80";

  const baseWidth = "0.5";

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-0">
      <svg
        className="w-[90%] h-[90%] max-w-none text-slate-400"

        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Combo 1: Circle + Octagon + Smaller rotated octagon */}
        {currentIndex === 0 && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            style={{ transformOrigin: "200px 200px" }}
          >
            {/* Circle */}
            <circle cx="200" cy="200" r="160" className={baseStroke} strokeWidth={baseWidth} />
            
            {/* Octagon */}
            <motion.polygon
              points={getPolygonPoints(8, 140)}
              className={baseStroke}
              strokeWidth={baseWidth}
              animate={{ rotate: 360 }}
              transition={{ duration: 40, ease: "linear", repeat: Infinity }}

              style={{ transformOrigin: "200px 200px" }}
            />
            
            {/* Smaller rotated octagon */}
            <motion.polygon
              points={getPolygonPoints(8, 100)}
              className={baseStroke}
              strokeWidth={baseWidth}
              initial={{ rotate: 22.5 }}
              animate={{ rotate: 22.5 - 360 }}
              transition={{ duration: 50, ease: "linear", repeat: Infinity }}

              style={{ transformOrigin: "200px 200px" }}
            />
          </motion.g>
        )}

        {/* Combo 2: Circle + Rounded square + Hexagon */}
        {currentIndex === 1 && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            style={{ transformOrigin: "200px 200px" }}
          >
            <circle cx="200" cy="200" r="160" className={baseStroke} strokeWidth={baseWidth} />
            
            {/* Rounded square */}
            <motion.rect
              x="90"
              y="90"
              width="220"
              height="220"
              rx="40"
              className={baseStroke}
              strokeWidth={baseWidth}
              animate={{ rotate: 360 }}
              transition={{ duration: 35, ease: "linear", repeat: Infinity }}

              style={{ transformOrigin: "200px 200px" }}
            />
            
            {/* Hexagon */}
            <motion.polygon
              points={getPolygonPoints(6, 80)}
              className={baseStroke}
              strokeWidth={baseWidth}
              animate={{ rotate: -360 }}
              transition={{ duration: 45, ease: "linear", repeat: Infinity }}

              style={{ transformOrigin: "200px 200px" }}
            />
          </motion.g>
        )}

        {/* Combo 3: 2 circles + 1 polygon (8 sides) */}
        {currentIndex === 2 && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            style={{ transformOrigin: "200px 200px" }}
          >
            <circle cx="200" cy="200" r="160" className={baseStroke} strokeWidth={baseWidth} />
            <circle cx="200" cy="200" r="120" className={baseStroke} strokeWidth={baseWidth} />
            
            {/* Octagon */}
            <motion.polygon
              points={getPolygonPoints(8, 140)}
              className={baseStroke}
              strokeWidth={baseWidth}
              animate={{ rotate: 360 }}
              transition={{ duration: 40, ease: "linear", repeat: Infinity }}

              style={{ transformOrigin: "200px 200px" }}
            />
          </motion.g>
        )}

        {/* Combo 4: Circle + Rotated square + Inner circle */}
        {currentIndex === 3 && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            style={{ transformOrigin: "200px 200px" }}
          >
            <circle cx="200" cy="200" r="160" className={baseStroke} strokeWidth={baseWidth} />
            <circle cx="200" cy="200" r="80" className={baseStroke} strokeWidth={baseWidth} />
            
            {/* Rotated square */}
            <motion.rect
              x="100"
              y="100"
              width="200"
              height="200"
              className={baseStroke}
              strokeWidth={baseWidth}
              initial={{ rotate: 45 }}
              animate={{ rotate: 45 + 360 }}
              transition={{ duration: 35, ease: "linear", repeat: Infinity }}

              style={{ transformOrigin: "200px 200px" }}
            />
          </motion.g>
        )}

        {/* Combo 5: Circle (slow rotate) + Polygon (opposite rotate) + Inner polygon (scale pulse) */}
        {currentIndex === 4 && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            style={{ transformOrigin: "200px 200px" }}
          >
            {/* Circle */}
            <motion.circle
              cx="200"
              cy="200"
              r="160"
              className={baseStroke}
              strokeWidth={baseWidth}
              animate={{ rotate: 360 }}
              transition={{ duration: 45, ease: "linear", repeat: Infinity }}

              style={{ transformOrigin: "200px 200px" }}
            />
            
            {/* Polygon (opposite rotate) */}
            <motion.polygon
              points={getPolygonPoints(8, 120)}
              className={baseStroke}
              strokeWidth={baseWidth}
              animate={{ rotate: -360 }}
              transition={{ duration: 35, ease: "linear", repeat: Infinity }}

              style={{ transformOrigin: "200px 200px" }}
            />
            
            {/* Inner polygon (scale pulse) */}
            <motion.polygon
              points={getPolygonPoints(6, 80)}
              className={baseStroke}
              strokeWidth={baseWidth}
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: 180
              }}
              transition={{ 
                scale: { duration: 4, ease: "easeInOut", repeat: Infinity },
                rotate: { duration: 30, ease: "linear", repeat: Infinity }
              }}

              style={{ transformOrigin: "200px 200px" }}
            />
          </motion.g>
        )}
      </svg>
    </div>
  );
}
