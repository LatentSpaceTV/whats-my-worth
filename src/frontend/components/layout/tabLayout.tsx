import React from 'react';

interface TabLayoutProps {
  leftColumn: React.ReactNode;
  rightColumn: React.ReactNode;
}

export const TabLayout: React.FC<TabLayoutProps> = ({ leftColumn, rightColumn }) => {
  return (
    <main className="flex-1 max-w-[1600px] 2xl:max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left column: Controls */}
        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          {leftColumn}
        </aside>

        {/* Right column: Results & Charts */}
        <div className="lg:col-span-8 space-y-8">
          {rightColumn}
        </div>
      </div>
    </main>
  );
};
