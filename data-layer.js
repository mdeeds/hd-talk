class DataLayer {
  constructor(databaseName) {
    this.databaseName = databaseName;
    this.db = null;
  }

  async _getDatabase() {
    if (!this.db) {
      this.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(this.databaseName, 1);
        request.onerror = event => reject(event.target.error);
        request.onsuccess = event => resolve(event.target.result);
        request.onupgradeneeded = event => {
          const db = event.target.result;
          const objectStore = db.createObjectStore('data', { keyPath: 'key' });
        };
      });
    }
    return this.db;
  }

  async setFloat32Array(key, data) {
    const db = await this._getDatabase();
    const transaction = db.transaction(['data'], 'readwrite');
    const objectStore = transaction.objectStore('data');
    const putRequest = objectStore.put({ key, value: data });
    await putRequest.done;
  }

  async getFloat32Array(key) {
    const db = await this._getDatabase();
    const transaction = db.transaction(['data'], 'readonly');
    const objectStore = transaction.objectStore('data');
    const getRequest = objectStore.get(key);
    const result = await getRequest.done;
    return result ? result.value : null;
  }

  async setJSObject(key, object) {
    const db = await this._getDatabase();
    const transaction = db.transaction(['data'], 'readwrite');
    const objectStore = transaction.objectStore('data');
    const putRequest = objectStore.put({ key, value: JSON.stringify(object) });
    await putRequest.done;
  }

  async getJSObject(key) {
    const db = await this._getDatabase();
    const transaction = db.transaction(['data'], 'readonly');
    const objectStore = transaction.objectStore('data');
    const getRequest = objectStore.get(key);
    const result = await getRequest.done;
    return result ? JSON.parse(result.value) : null;
  }
}