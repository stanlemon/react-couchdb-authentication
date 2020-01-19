import * as React from "react";
import PouchDB from "pouchdb";
import retry from "async-retry";
import fetch from "isomorphic-fetch";

const ROUTE_LOGIN = "login";
const ROUTE_SIGNUP = "signup";

interface Props {
  /**
   * An application that requires authentication.
   */
  children?: React.ReactElement<{}>;
  /**
   * Adapter for use by the local PouchDB instance, defaults to "idb".
   */
  adapter: string;
  /**
   * URL of the remote CouchDB instance to use for authentication.
   */
  url: string;
  /**
   * In debug mode info logs go to the console.
   */
  debug: boolean;
  /**
   * Whether or not to sync the user's database locally, defaults to true.
   */
  sync: boolean;
  /**
   * A component to be used for the login screen.
   */
  login: React.ReactElement<{
    error: string;
    login(username: string, password: string): void;
    navigateToSignUp(): void;
  }>;
  /**
   * A component to be used for the signup screen.
   */
  signup: React.ReactElement<{
    error: string;
    signUp(username: string, password: string, email: string): void;
    navigateToLogin(): void;
  }>;
  /**
   * A component to be used when loading, defaults to a fragment with the text "Loading...".
   */
  loading?: React.ReactElement<{}>;
}

interface State {
  /**
   * Whether or not the first call to check for a session to the remote CouchDB instance has been made.
   */
  loaded: boolean;
  /**
   * Used to track whether the user is viewing the login or sign up screen.
   */
  internalRoute: string;
  /**
   * An error message if something has gone wrong.
   */
  error: string;
  /**
   * Whether or not the user is currently authenticated to the remote CouchDB instance.
   */
  authenticated: boolean;
  /**
   * Current authenticated user.
   */
  user: {
    /**
     * Current authenticated user's name (used as part of it's document).
     */
    name: string;
  };
}

export const AuthenticationContext = React.createContext({});

/**
 * Wrap components behind CouchDB authentication and sync the user's database locally.
 */
export class Authentication extends React.Component<Props, State> {
  static defaultProps = {
    loading: <>Loading...</>,
    debug: false,
    sync: true,
    adapter: "idb"
  };

  state = {
    // If errors bubble up and need to be provided to the login screen
    error: null,
    // Used to denote before/after we've attempted an initial login
    loaded: false,
    // Whether or not a user is logged in
    authenticated: false,
    // User object, if they are logged in
    user: null,
    // Internal route path, defaults to the login screen
    internalRoute: ROUTE_LOGIN
  };

  private localDb: PouchDB.Database;
  private remoteDb: PouchDB.Database;
  private syncHandler: PouchDB.Replication.Sync<{}>;
  private checkSessionInterval: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private log(...args: any): void {
    if (this.props.debug) {
      // eslint-disable-next-line no-console
      console.log.apply(null, args);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private error(...args: any): void {
    if (this.props.debug) {
      // eslint-disable-next-line no-console
      console.error.apply(null, args);
    }
  }

  private getUserDb(username: string): string {
    const buffer = Buffer.from(username);
    const hexUsername = buffer.toString("hex");
    return "userdb-" + hexUsername;
  }

  private getUserDbUrl(username: string): string {
    return (
      this.props.url.substring(0, this.props.url.lastIndexOf("/") + 1) +
      this.getUserDb(username)
    );
  }

  private signUp = async (
    username: string,
    password: string,
    email: string
  ): Promise<void> => {
    if (!username || !password || !email) {
      this.setState({
        error: "Username, password and email are required fields."
      });
      return;
    }

    const userId = "org.couchdb.user:" + username;

    const user = {
      name: username,
      password,
      roles: [],
      type: "user",
      _id: userId,
      // TODO: Allow for any metadata
      metadata: { email }
    };

    try {
      const response = await this.fetch<{
        error?: string;
        reason?: string;
        ok?: boolean;
      }>(this.props.url + "_users/" + userId, {
        method: "PUT",
        body: JSON.stringify(user)
      });

      if (response.error) {
        //{error: "conflict", reason: "Document update conflict."}
        this.setState({ error: response.reason });
        return;
      }

      if (!response.ok) {
        this.setState({ error: "An unknown error has occurred" });
      }

      await this.checkForDb(username);

      await this.login(username, password);
    } catch (err) {
      this.error(err);
    }
  };

  private async checkForDb(username: string): Promise<void> {
    await retry(
      async () => {
        const info = await this.fetch<{ error: string; reason: string }>(
          this.getUserDbUrl(username)
        );

        const isFound =
          info.error === "not_found" ||
          (info.error === "forbidden" &&
            info.reason &&
            (info.reason === "You are not allowed to access this db." ||
              info.reason === "_reader access is required for this request"));

        if (!isFound) {
          throw Error("Cannot find database " + username);
        }

        return info;
      },
      { retries: 5 }
    );
  }

  private fetch<T>(url: string, options: {} = {}): Promise<T> {
    return fetch(url, {
      ...options,
      ...{
        cache: "no-cache",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      }
    }).then(r => r.json());
  }

  private async checkSession(): Promise<void> {
    try {
      const session = await this.fetch<{ userCtx: { name: string } }>(
        this.props.url + "_session"
      );
      this.log("User session", session);

      const isLoggedIn = !!session.userCtx.name;

      this.setState({
        loaded: true,
        authenticated: isLoggedIn,
        user: session.userCtx
      });

      // If we are logged in and have not yet setup our remote db connection, set it up
      if (isLoggedIn && !this.remoteDb) {
        this.setupDb();
      }
    } catch (err) {
      this.error(err);
      this.setState({ loaded: true, user: null, authenticated: false });
    }
  }

  private logout = async (): Promise<void> => {
    try {
      await this.fetch(this.props.url + "_session", {
        method: "DELETE"
      });

      // Clear the user and redirect them to our login screen
      this.setState({
        user: null,
        authenticated: false,
        internalRoute: ROUTE_LOGIN
      });
    } catch (err) {
      this.error(err);
    }
  };

  private login = async (username: string, password: string): Promise<void> => {
    if (!username || !password) {
      this.setState({ error: "Invalid login" });
      return;
    }

    try {
      const user = await this.fetch<{ name: string }>(
        this.props.url + "_session",
        {
          method: "POST",
          body: JSON.stringify({ username, password })
        }
      );

      this.setState({ authenticated: true, user });

      this.setupDb();
    } catch (err) {
      this.setState({ authenticated: false, user: null });
      this.error(err);
    }
  };

  private async setupDb(): Promise<void> {
    this.localDb = new PouchDB("user", {
      adapter: this.props.adapter
    });

    const opts = {
      skip_setup: true,
      fetch: (url: string, opts: RequestInit): Promise<Response> => {
        // In PouchDB 7.0 they dropped this and it breaks cookie authentication, so we set this explicitly
        opts.credentials = "include";
        return PouchDB.fetch(url, opts);
      }
    };

    const userDbUrl = this.getUserDbUrl(this.state.user.name);

    this.remoteDb = new PouchDB(userDbUrl, opts);

    if (!this.props.sync) {
      this.log("Sync is disabled");
      return;
    }

    this.syncHandler = PouchDB.sync(this.localDb, this.remoteDb, {
      live: true,
      retry: true
    });

    this.syncHandler
      .on("change", info => this.log("Change", info))
      .on("paused", err => this.error("Paused", err))
      .on("complete", info => this.log("Complete", info))
      .on("error", err => this.error("Error", err));
  }

  componentDidMount(): void {
    if (!this.props.url) {
      throw new Error("A url to a couchdb instance is required");
    }

    this.checkSession();

    this.checkSessionInterval = window.setInterval(() => {
      this.checkSession();
    }, 15000);
  }

  async componentWillUnmount(): Promise<void> {
    clearInterval(this.checkSessionInterval);

    // Will not be set if sync has been disabled
    if (this.syncHandler) {
      await this.syncHandler.cancel();
    }

    await this.remoteDb.close();
  }

  render(): React.ReactNode {
    // If we haven't completed our initial load yet, show a loader
    if (!this.state.loaded) {
      this.log("Waiting for initial database to load");
      return this.props.loading;
    }

    // We have loaded our remote database but we are not authenticated
    if (!this.state.authenticated) {
      if (this.state.internalRoute === ROUTE_SIGNUP) {
        const props = {
          // Switches to the login screen and clears out any errors
          navigateToLogin: (): void =>
            this.setState({
              error: null,
              internalRoute: ROUTE_LOGIN
            }),
          error: this.state.error,
          signUp: this.signUp
        };

        if (!React.isValidElement(this.props.signup)) {
          return React.createElement(this.props.signup, props);
        } else {
          return React.cloneElement(this.props.signup, props);
        }
      }

      const props = {
        // Switches to the sign up screen and clears out any errors
        navigateToSignUp: (): void =>
          this.setState({
            error: null,
            internalRoute: ROUTE_SIGNUP
          }),
        error: this.state.error,
        login: this.login
      };

      // If we aren't on the signup screen we should return the login screen
      if (!React.isValidElement(this.props.login)) {
        return React.createElement(this.props.login, props);
      } else {
        return React.cloneElement(this.props.login, props);
      }
    }

    const props = {
      db: this.localDb,
      logout: this.logout,
      user: this.state.user
    };

    // TODO: Remove the props overrides, the Context should be the only way to get these.

    // We are authenticated and synced so load our application
    if (!React.isValidElement(this.props.children)) {
      return (
        <AuthenticationContext.Provider value={props}>
          {React.createElement(this.props.children, props)}
        </AuthenticationContext.Provider>
      );
    } else {
      return (
        <AuthenticationContext.Provider value={props}>
          {React.cloneElement(this.props.children, props)}
        </AuthenticationContext.Provider>
      );
    }
  }
}
