import * as React from "react";
import PouchDB from "pouchdb";
import retry from "async-retry";
import fetch from "isomorphic-fetch";

const ROUTE_LOGIN = "login";
const ROUTE_SIGNUP = "signup";

interface Props {
  children?: React.ReactElement<{}>;
  localAdapter: string;
  url: string;
  debug: boolean;
  sync: boolean;
  login: React.ReactElement<{}>;
  signup: React.ReactElement<{}>;
  loading?: React.ReactElement<{}>;
}

interface State {
  loaded: boolean;
  internalRoute: string;
  error: string;
  authenticated: boolean;
  user: {
    name: string;
  };
}

export class Authentication extends React.Component<Props, State> {
  static defaultProps = {
    debug: false,
    sync: true,
    localAdapter: "idb"
  };

  localDb: PouchDB.Database;
  remoteDb: PouchDB.Database;
  syncHandler: PouchDB.Replication.Sync<{}>;
  checkSessionInterval: number;

  constructor(props: Props) {
    super(props);

    this.state = {
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
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(...args: any): void {
    if (this.props.debug) {
      // eslint-disable-next-line no-console
      console.log.apply(null, args);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(...args: any): void {
    if (this.props.debug) {
      // eslint-disable-next-line no-console
      console.error.apply(null, args);
    }
  }

  getUserDb(username: string): string {
    const buffer = Buffer.from(username);
    const hexUsername = buffer.toString("hex");
    return "userdb-" + hexUsername;
  }

  getUserDbUrl(username: string): string {
    return (
      this.props.url.substring(0, this.props.url.lastIndexOf("/") + 1) +
      this.getUserDb(username)
    );
  }

  signUp = async (
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

  async checkForDb(username: string): Promise<void> {
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

  fetch<T>(url: string, options: {} = {}): Promise<T> {
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

  componentDidMount(): void {
    if (!this.props.url) {
      throw new Error("A url to a couchdb instance is required");
    }

    this.checkSession();

    this.checkSessionInterval = window.setInterval(() => {
      this.checkSession();
    }, 15000);
  }

  async checkSession(): Promise<void> {
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

  logout = async (): Promise<void> => {
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

  login = async (username: string, password: string): Promise<void> => {
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

  async setupDb(): Promise<void> {
    this.localDb = new PouchDB("user", {
      adapter: this.props.localAdapter
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

  async componentWillUnmount(): Promise<void> {
    clearInterval(this.checkSessionInterval);

    await this.syncHandler.cancel();

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
      //remoteDb: this.remoteDb,
      logout: this.logout,
      user: this.state.user
    };

    // We are authenticated and synced so load our application
    if (!React.isValidElement(this.props.children)) {
      return React.createElement(this.props.children, props);
    } else {
      return React.cloneElement(this.props.children, props);
    }
  }
}
