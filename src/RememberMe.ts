/**
 * Basic shape of a RememberMe class, this one does not store credentials.
 */
export class RememberMe {
  async getCredentials(key) {
    return new Promise((resolve, reject) => {
      resolve(false);
    });
  }

  async setCredentials(username, password) {
    return new Promise((resolve, reject) => {
      resolve(false);
    });
  }

  async clearCredentials(key) {
    return new Promise((resolve, reject) => {
      resolve(false);
    });
  }
}
