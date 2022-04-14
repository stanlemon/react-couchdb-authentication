import * as React from "react";
import PouchDB from "pouchdb";
import retry from "async-retry";
import { Login } from "./Login";
import { LoginView } from "./LoginView";
import { SignUp } from "./SignUp";
import { SignUpView } from "./SignUpView";
import { Buffer } from "buffer";
import {
  setIntervalAsync,
  clearIntervalAsync,
  SetIntervalAsyncTimer,
} from "set-interval-async/dynamic";

const ROUTE_LOGIN = "login";
const ROUTE_SIGNUP = "signup";

interface Props {
  /**
   * An application that requires authentication.
   */
  children?: React.ReactElement;
  /**
   * Name of the local PouchDB database, defaults to "user".
   */
  localDbName: string;
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
  login: React.ReactElement;
  /**
   * A component to be used for the signup screen.
   */
  signup: React.ReactElement;
  /**
   * A component to be used when loading, defaults to a fragment with the text "Loading...".
   */
  loading?: React.ReactElement;
  /**
   * Interval to check the session.
   */
  sessionInterval: number;
  /**
   * Whether or not to use the out of the box scaffolding for an app that requires login.
   * The scaffolding include routing to a login view and signup view. This is an easy turn key way
   * to get started!
   */
  scaffold: boolean;
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
  error?: string;
  /**
   * Whether or not the user is currently authenticated to the remote CouchDB instance.
   */
  authenticated: boolean;
  /**
   * Current authenticated user.
   */
  user?: {
    /**
     * Current authenticated user's name (used as part of it's document).
     */
    name: string;
  };
}

export type ContextType = {
  db?: PouchDB.Database;
  remoteDb?: PouchDB.Database;
  authenticated: boolean;
  user?: {
    name: string;
  };
  error: string;
  login(username: string, password: string): void | Promise<void>;
  logout(): void;
  signUp(username: string, password: string, email: string): Promise<void>;
  navigateToLogin(): void;
  navigateToSignUp(): void;
};

export const Context = React.createContext<ContextType>({
  db: undefined,
  remoteDb: undefined,
  authenticated: false,
  user: undefined,
  error: "",
  login: (username, password) => {
    // Empty
  },
  logout: () => {
    // Empty
  },
  signUp: (username, password, email) => {
    return Promise.resolve();
  },
  navigateToLogin: () => {
    // Empty
  },
  navigateToSignUp: () => {
    // Empty
  },
});

/**
 * Wrap components behind CouchDB authentication and sync the user's database locally.
 */
export class Authentication extends React.Component<Props, State> {
  static defaultProps = {
    login: <Login component={LoginView} />,
    signup: <SignUp component={SignUpView} />,
    loading: <>Loading...</>,
    debug: false,
    sync: true,
    localDbName: "user",
    adapter: "idb",
    sessionInterval: 15000,
    scaffold: true,
  };

  state = {
    // If errors bubble up and need to be provided to the login screen
    error: undefined,
    // Used to denote before/after we've attempted an initial login
    loaded: false,
    // Whether or not a user is logged in
    authenticated: false,
    // User object, if they are logged in
    user: undefined,
    // Internal route path, defaults to the login screen
    internalRoute: ROUTE_LOGIN,
  } as State;

  #localDb: PouchDB.Database;
  #remoteDb?: PouchDB.Database &
    // Does this look weird? It should!
    // The fetch method is added by the http adapter, but it's not exported.
    // In order to use it below we declare it here, but to avoid other problems
    // we've made it as a partial. Sometimes types are hard!
    Partial<{
      fetch(url: string | Request, opts?: RequestInit): Promise<Response>;
    }>;

  #syncHandler?: PouchDB.Replication.Sync<Record<string, unknown>>;
  #checkSessionInterval?: SetIntervalAsyncTimer;

  constructor(props: Props) {
    super(props);

    if (!this.props.url) {
      throw new Error("A url to a couchdb instance is required");
    }

    this.#localDb = new PouchDB(this.props.localDbName, {
      adapter: this.props.adapter,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private log(...args: any[]): void {
    if (this.props.debug) {
      // eslint-disable-next-line no-console
      console.log.apply(null, args);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private error(...args: any[]): void {
    if (this.props.debug) {
      // eslint-disable-next-line no-console
      console.error.apply(null, args);
    }
  }

  private getUserDb(username: string): string | null {
    if (!username) {
      return null;
    }
    const buffer = Buffer.from(username);
    const hexUsername = buffer.toString("hex");
    return "userdb-" + hexUsername;
  }

  private getUserDbUrl(username: string): string {
    return (
      this.props.url.substring(0, this.props.url.lastIndexOf("/") + 1) +
      (this.getUserDb(username) || "")
    );
  }

  private signUp = async (
    username: string,
    password: string,
    email: string
  ): Promise<void> => {
    if (!username || !password || !email) {
      this.setState({
        error: "Username, password and email are required fields.",
      });
      return;
    }

    const userId = "org.couchdb.user:" + username;

    const user = {
      name: username,
      password,
      roles: [] as string[],
      type: "user",
      _id: userId,
      // TODO: Allow for any metadata
      metadata: { email },
    };

    try {
      const response = await this.fetch<{
        error?: string;
        reason?: string;
        ok?: boolean;
      }>(this.props.url + "_users/" + userId, {
        method: "PUT",
        body: JSON.stringify(user),
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

  private fetch<T>(
    url: string,
    options: Record<string, unknown> = {}
  ): Promise<T> {
    return fetch(url, {
      ...options,
      ...{
        cache: "no-cache",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      },
    }).then((r) => r.json() as unknown as T);
  }

  private async grabSession(): Promise<{ name: string }> {
    // If we have a remoteDb, we'll use it. This works better in Safari which does
    // not support storing cross-origin cookies across multiple requests.
    if (
      this.#remoteDb &&
      this.state &&
      this.state.user &&
      this.state.user.name
    ) {
      const user = await this.fetch(
        `${this.props.url}/_users/org.couchdb.user:${this.state.user.name}`
      ).catch((err) => this.error(err));

      return user as { name: string };
    } else {
      const session = await this.fetch<{
        userCtx: { name: string };
      }>(this.props.url + "_session");

      return session.userCtx;
    }
  }

  private async checkSession(): Promise<void> {
    try {
      const user = await this.grabSession();

      this.log("User session", user);

      const isLoggedIn = user !== null && user.name !== null;

      this.setState({
        loaded: true,
        authenticated: isLoggedIn,
        user,
      });

      // If we are logged in and have not yet setup our remote db connection, set it up
      if (isLoggedIn && !this.#remoteDb) {
        this.log("User is already logged in, setting up db.");
        this.setupDb();
        // Immediately check the session again so we fully load the user
        await this.checkSession();
      }
    } catch (err) {
      this.error(err);
      this.setState({ loaded: true, user: undefined, authenticated: false });
    }
  }

  private logout = (): void => {
    void (async () => {
      try {
        await this.fetch(this.props.url + "_session", {
          method: "DELETE",
        });

        // Clear the user and redirect them to our login screen
        this.setState({
          user: undefined,
          authenticated: false,
          internalRoute: ROUTE_LOGIN,
        });
      } catch (err) {
        this.error(err);
      }
    })();
  };

  private login = async (username: string, password: string): Promise<void> => {
    if (!username || !password) {
      this.setState({ error: "Invalid login" });
      return;
    }

    try {
      type UserResponse = {
        name: string;
      };

      type UserErrorResponse = {
        error: string;
        reason: string;
      };

      const response = await this.fetch<UserResponse | UserErrorResponse>(
        this.props.url + "_session",
        {
          method: "POST",
          body: JSON.stringify({ username, password }),
        }
      );

      const userError = response as UserErrorResponse;

      // If the login fails, set the reason as error and make sure we show as unauthenticated
      if (!userError || userError.error) {
        this.setState({
          authenticated: false,
          error: userError.reason,
        });
        return;
      }

      const user = response as UserResponse;

      this.setState({ authenticated: true, user });

      this.setupDb(username, password);
    } catch (err) {
      this.setState({ authenticated: false, user: undefined });
      this.error(err);
    }
  };

  private setupDb(username?: string, password?: string): void {
    const opts = {
      skip_setup: true,
      fetch: (url: string, opts: RequestInit): Promise<Response> => {
        // In PouchDB 7.0 they dropped this and it breaks cookie authentication, so we set this explicitly
        opts.credentials = "include";
        return PouchDB.fetch(url, opts);
      },
      // Safari does some weird stuff if we don't do this, Chrome and Firefox work fine
      ...(username && password
        ? {
            auth: {
              username,
              password,
            },
          }
        : {}),
    } as PouchDB.Configuration.RemoteDatabaseConfiguration;

    if (!this.state.user || !this.state.user.name) {
      return;
    }

    const userDbUrl = this.getUserDbUrl(this.state.user.name);

    this.#remoteDb = new PouchDB(userDbUrl, opts);

    // This is because we're setting important properties that aren't in state
    this.forceUpdate();

    if (!this.props.sync) {
      this.log("Sync is disabled");
      return;
    }

    this.#syncHandler = PouchDB.sync(this.#localDb, this.#remoteDb, {
      live: true,
      retry: true,
    });

    this.#syncHandler
      .on("change", (info) => this.log("Change", info))
      .on("paused", (info) => this.log("Syncing Paused", info))
      .on("complete", (info) => this.log("Complete", info))
      .on("error", (err) => this.error("Error", err))
      .catch((err) => this.error(err));
  }

  async componentDidMount(): Promise<void> {
    await this.checkSession();

    this.#checkSessionInterval = setIntervalAsync(async () => {
      await this.checkSession();
    }, this.props.sessionInterval);
  }

  async componentWillUnmount(): Promise<void> {
    if (this.#checkSessionInterval) {
      await clearIntervalAsync(this.#checkSessionInterval);
    }

    // Will not be set if sync has been disabled
    if (this.#syncHandler) {
      this.#syncHandler.cancel();
    }

    if (this.#remoteDb) {
      await this.#remoteDb.close();
    }
  }

  render(): React.ReactNode {
    // If we haven't completed our initial load yet, show a loader
    if (!this.state.loaded || !this.#localDb) {
      this.log("Waiting for initial database");
      return this.props.loading;
    }

    // Switches to the login screen and clears out any errors
    const navigateToLogin = (): void =>
      this.setState({
        error: undefined,
        internalRoute: ROUTE_LOGIN,
      });

    // Switches to the sign up screen and clears out any errors
    const navigateToSignUp = (): void =>
      this.setState({
        error: undefined,
        internalRoute: ROUTE_SIGNUP,
      });

    const value = {
      db: this.#localDb,
      remoteDb: this.#remoteDb,
      authenticated: this.state.authenticated,
      user: this.state.user,
      error: this.state.error,
      login: this.login,
      logout: this.logout,
      signUp: this.signUp,
      navigateToLogin,
      navigateToSignUp,
    } as ContextType;

    return (
      <Context.Provider value={value}>{this.renderChildren()}</Context.Provider>
    );
  }

  private renderChildren(): React.ReactNode {
    // We have loaded our remote database but we are not authenticated
    if (this.props.scaffold && !this.state.authenticated) {
      if (this.state.internalRoute === ROUTE_SIGNUP) {
        return React.cloneElement(this.props.signup);
      }
      // If we aren't on the signup screen we should return the login screen
      return React.cloneElement(this.props.login);
    }

    return this.props.children;
  }
}
