import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AnimatedIconProps {
  icon: LucideIcon;
  colorScheme: 'blue' | 'cyan' | 'pink' | 'purple' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AnimatedIcon: React.FC<AnimatedIconProps> = ({ 
  icon: Icon, 
  colorScheme, 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const getColorClasses = () => {
    switch (colorScheme) {
      case 'blue':
        return 'bg-gradient-to-br from-[#3250fa] to-[#3250fa]/80';
      case 'cyan':
        return 'bg-gradient-to-br from-[#00f0ff] to-[#00f0ff]/80';
      case 'pink':
        return 'bg-gradient-to-br from-[#ff538f] to-[#ff538f]/80';
      case 'purple':
        return 'bg-gradient-to-br from-[#3250fa] to-[#ff538f]';
      case 'gradient':
        return 'bg-gradient-to-br from-[#3250fa] via-[#00f0ff] to-[#ff538f]';
      default:
        return 'bg-gradient-to-br from-[#3250fa] to-[#00f0ff]';
    }
  };

  const getGlowClasses = () => {
    switch (colorScheme) {
      case 'blue':
        return 'shadow-[0_0_20px_rgba(50,80,250,0.3)] hover:shadow-[0_0_30px_rgba(50,80,250,0.5)]';
      case 'cyan':
        return 'shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)]';
      case 'pink':
        return 'shadow-[0_0_20px_rgba(255,83,143,0.3)] hover:shadow-[0_0_30px_rgba(255,83,143,0.5)]';
      case 'purple':
        return 'shadow-[0_0_20px_rgba(50,80,250,0.2)] hover:shadow-[0_0_30px_rgba(255,83,143,0.4)]';
      case 'gradient':
        return 'shadow-[0_0_20px_rgba(50,80,250,0.2)] hover:shadow-[0_0_30px_rgba(0,240,255,0.4)]';
      default:
        return 'shadow-[0_0_20px_rgba(50,80,250,0.2)] hover:shadow-[0_0_30px_rgba(0,240,255,0.4)]';
    }
  };

  const getIconColor = () => {
    switch (colorScheme) {
      case 'blue':
        return 'text-[#3250fa]';
      case 'cyan':
        return 'text-[#00f0ff]';
      case 'pink':
        return 'text-[#ff538f]';
      case 'purple':
        return 'text-[#3250fa]';
      case 'gradient':
        return 'text-[#3250fa]';
      default:
        return 'text-[#3250fa]';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Subtle rotating glow background */}
      <div className="absolute inset-0 rounded-full opacity-20 animate-spin-slow">
        <div 
          className={`w-full h-full rounded-full blur-md`}
          style={{
            background: `conic-gradient(from 0deg, #3250fa, #00f0ff, #ff538f, #3250fa)`
          }}
        />
      </div>
      
      {/* Icon container with no background */}
      <div 
        className={`
          relative ${sizeClasses[size]}
          flex items-center justify-center
          transition-all duration-500 ease-in-out
          hover:scale-110
          ${getGlowClasses()}
        `}
      >
        {/* Icon with color based on scheme */}
        <Icon className={`${iconSizes[size]} relative z-10 transition-all duration-300 ${getIconColor()}`} />
      </div>
    </div>
  );
};

// CSS for slow spin animation - add this to your global styles
const styles = `
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .animate-spin-slow {
    animation: spin-slow 8s linear infinite;
  }
`;

// Export styles to be added to global CSS
export { styles as animatedIconStyles };