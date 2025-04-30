import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  initials?: string;
  size?: number;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, alt = '', initials = '', size = 48, className = '' }) => {
  return (
    <div
      className={`rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      ) : (
        <span className="text-slate-500 text-xl font-bold">
          {initials}
        </span>
      )}
    </div>
  );
};

export default Avatar; 