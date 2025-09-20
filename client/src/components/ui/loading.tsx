import React from 'react';
import { motion } from 'framer-motion';
import { Gift } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <motion.div
      className={`spinner ${sizeClasses[size]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
};

interface LoadingPageProps {
  message?: string;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({ 
  message = "Loading..." 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ivory-white to-gray-50">
      <div className="text-center">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Gift className="w-8 h-8 text-white" />
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-heading text-2xl font-semibold text-gradient-primary mb-2"
        >
          Simri
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-600"
        >
          {message}
        </motion.p>
        
        <motion.div
          className="mt-4"
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="h-1 bg-gradient-primary rounded-full max-w-xs mx-auto opacity-30" />
        </motion.div>
      </div>
    </div>
  );
};

export default LoadingSpinner;