import React, { useEffect, useState } from 'react';

interface AnnouncementBannerProps {
  title: string | null;
  subtitle: string | null;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ title, subtitle }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (title) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [title, subtitle]);

  if (!visible || !title) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30 animate-bounce">
      <div className="px-8 py-3 rounded-2xl bg-gradient-to-r from-red-600/90 via-amber-500/90 to-red-600/90 border-2 border-yellow-300 shadow-[0_0_30px_rgba(234,179,8,0.8)] backdrop-blur-md text-center">
        <h2 className="font-pixel text-2xl md:text-3xl text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] tracking-wider">
          {title}
        </h2>
        {subtitle && (
          <p className="font-digital text-sm md:text-base text-yellow-100 font-bold mt-1 tracking-widest uppercase">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
