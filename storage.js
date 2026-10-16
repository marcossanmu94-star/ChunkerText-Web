const Storage = {
  async get(key) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.get([key], (result) => resolve(result ? result[key] : null));
        });
      }
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.warn('Storage.get error:', e);
      return null;
    }
  },
  
  async set(key, value) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [key]: value }, () => resolve());
        });
      }
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage.set error:', e);
    }
  },

  onChange(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
          callback(changes);
        }
      });
    } else {
      window.addEventListener('storage', (e) => {
        if (e.key) {
          try {
            callback({
              [e.key]: {
                oldValue: e.oldValue ? JSON.parse(e.oldValue) : null,
                newValue: e.newValue ? JSON.parse(e.newValue) : null
              }
            });
          } catch (err) {
            console.warn('Storage onChange parse error:', err);
          }
        }
      });
    }
  }
};

