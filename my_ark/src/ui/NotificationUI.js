/**
 * NotificationUI - Floating comic-style popup alerts and item collection logs
 */

export class NotificationUI {
  constructor() {
    this.container = document.getElementById('notifications-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notifications-container';
      document.body.appendChild(this.container);
    }
  }

  show(text, type = 'info') {
    const item = document.createElement('div');
    item.className = `notif-badge notif-${type}`;
    
    let icon = '⚡';
    if (type === 'loot') icon = '📦';
    else if (type === 'craft') icon = '🔨';
    else if (type === 'tame') icon = '🦕';
    else if (type === 'mount') icon = '🦖';
    else if (type === 'damage') icon = '🩸';
    else if (type === 'hit') icon = '💥';
    else if (type === 'food') icon = '🍎';
    else if (type === 'alert') icon = '⚠️';

    item.innerHTML = `<span class="notif-icon">${icon}</span> <span class="notif-text">${text}</span>`;
    this.container.appendChild(item);

    setTimeout(() => {
      item.classList.add('fade-out');
      setTimeout(() => {
        if (item.parentNode) item.parentNode.removeChild(item);
      }, 400);
    }, 2800);
  }
}
