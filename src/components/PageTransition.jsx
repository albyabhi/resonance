import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

export default function PageTransition({ children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(8px)", y: 10 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      exit={{ opacity: 0, filter: "blur(8px)", y: -10 }}
      transition={{ 
        duration: 0.5, 
        ease: [0.16, 1, 0.3, 1] 
      }}
      className={`w-full h-full ${className}`}
    >
      {children}
    </motion.div>
  );
}
