/**
 * Basic shape of a RememberMe class, this one does not store credentials.
 */
export class RememberMe {
  async getCredentials(): Promise<
    | {
        username: string;
        password: string;
      }
    | false
  > {
    return new Promise((resolve, reject) => {
      resolve(false);
    });
  }

  async setCredentials(username: string, password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      resolve(false);
    });
  }

  async clearCredentials(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      resolve(false);
    });
  }
}
