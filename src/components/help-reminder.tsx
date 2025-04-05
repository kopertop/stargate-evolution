import React from 'react';
import { resetTutorial } from './movement-tutorial';

interface HelpReminderProps {
  // Add any props if needed
}

const HelpReminder: React.FC<HelpReminderProps> = () => {
  // Handle normal click to show the help dialog
  const handleHelpClick = () => {
    // Simulate pressing the ? key to show the help dialog
    const event = new KeyboardEvent('keydown', { key: '?' });
    window.dispatchEvent(event);
  };

  // Handle right-click to reset tutorial (useful for testing)
  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent context menu
    resetTutorial();
    // Show confirmation message
    alert('Tutorial reset. It will show again on next page load.');
  };

  return (
    <div
      className="help-button"
      onClick={handleHelpClick}
      onContextMenu={handleRightClick}
      title="Click for help (right-click to reset tutorial)"
    >
      ?
    </div>
  );
};

export default HelpReminder;
