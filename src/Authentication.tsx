import * as React from "react";
import PouchDB from "pouchdb";
import PouchDBAuthentication from "pouchdb-authentication";
import { RememberMe } from "./RememberMe";

// We only use the signUp method, maybe we don't need this?
PouchDB.plugin(PouchDBAuthentication);

const ROUTE_LOGIN = "login";
const ROUTE_SIGNUP = "signup";

interface Props {
  children?: React.ReactElement<{}>;
  localAdapter: string;
  localDatabase: string;
  url: string;
  sync: boolean;
  login: React.ReactElement<{}>;
  signup: React.ReactElement<{}>;
  loading?: React.ReactElement<{}>;
  rememberMe: {
    getCredentials(): Promise<{ username: string; password: string } | false>;
    setCredentials(username: string, password: string): Promise<boolean>;
    clearCredentials(): Promise<boolean>;
  };
  maxUserDbRetries: number;
  userDbRetryInterval: number;
}

interface State {
  loaded: boolean;
  authenticated: boolean;
  synced: boolean;
  internalRoute: string;
  error: string;
  user: {};
}

export class Authentication extends React.Component<Props, State> {
  static defaultProps = {
    sync: true,
    localAdapter: "idb",
    localDatabase: "local",
    // This is a default implementation that does not actually remember anything
    rememberMe: new RememberMe(),
    maxUserDbRetries: 5,
    userDbRetryInterval: 2500
  };

  private authDb: PouchDB.Database;
  private localDb: PouchDB.Database;
  private remoteDb: PouchDB.Database;

  constructor(props: Props) {
    super(props);

    this.state = {
      // If errors bubble up and need to be provided to the login screen
      error: null,
      // Used to denote before/after we've attempted an initial login
      loaded: false,
      // Used to denote whether or not we have a valid couchdb username/password
      authenticated: false,
      // Used to denote whether or not syncing has completed, this is important after a login before we have remote data
      synced: false,
      // Internal route path, defaults to the login screen
      internalRoute: ROUTE_LOGIN,
      // The current user
      user: null
    };

    // PouchDB instance for authenticating users against, takes a URL
    this.authDb = this.newRemoteDb(this.props.url);

    // PouchDB instance for local data storage (will use localAdapter property)
    this.localDb = this.newLocalDb(this.props.localDatabase);
    // PouchDB instance for syncing to/from
    this.remoteDb = null;
  }

  newLocalDb(database: string): PouchDB.Database {
    if (!database) {
      throw new Error("Local database name not specified");
    }

    console.log(
      "Setting up local db " + database + " using " + this.props.localAdapter
    );

    return new PouchDB(database, {
      adapter: this.props.localAdapter
    });
  }

  newRemoteDb(
    url: string,
    username?: string,
    password?: string
  ): PouchDB.Database {
    console.log("Setting up remote db " + url);

    if (!url) {
      throw new Error("Remote database url not specified");
    }

    // Every remote database should skip setup
    const defaults = {
      skip_setup: true,
      fetch: (url: string, opts: RequestInit): Promise<Response> => {
        // In PouchDB 7.0 they dropped this and it breaks cookie authentication, so we set this explicitly
        opts.credentials = "include";
        return PouchDB.fetch(url, opts);
      }
    };

    const options =
      // If a username and password is provided
      username && password
        ? // Append auth options to the connections
          { ...defaults, auth: { username, password } }
        : // Otherwise just use the defaults
          defaults;

    return new PouchDB(url, options);
  }

  dbInfo(
    db: PouchDB.Database,
    success: (info: {}) => void,
    fail: (message: string) => void
  ): void {
    db.info().then((info: PouchDB.Core.DatabaseInfo & PouchDB.Core.Error) => {
      if (
        info &&
        info.error &&
        (info.error === "not_found" ||
          (info.error === "forbidden" &&
            info.reason &&
            (info.reason === "You are not allowed to access this db." ||
              info.reason === "_reader access is required for this request")))
      ) {
        fail(
          "Authentication error, you are not allowed to access this database (yet)."
        );
      } else {
        success(info);
      }
    });
  }

  watchForUserDb(
    username: string,
    password: string,
    callback: (info: {}) => void
  ): void {
    const userDb = this.getUserDb(username, password);

    let retries = 0;

    const checkDb = (): void =>
      this.dbInfo(
        userDb,
        // Success, our database is setup
        info => {
          console.log("Success, our database is setup!", info);
          callback(info);
        },
        info => {
          console.log("Fail, our database is not setup yet!", info);

          retries++;

          if (retries > this.props.maxUserDbRetries) {
            console.log(
              "Reached maximum number of retry checks for the user db"
            );
            this.setState({
              internalRoute: ROUTE_LOGIN,
              error:
                "Your user database is not setup yet, please try again later."
            });
            userDb.close();
            return;
          }

          setTimeout(() => {
            console.log("Attempting to check db again");
            checkDb();
          }, this.props.userDbRetryInterval);
        }
      );

    checkDb();
  }

  getUserDb(username: string, password: string): PouchDB.Database {
    console.log("Setting up remote db for user " + username);

    const remoteDbUrl = this.getUserDbUrl(username);

    const userDb = this.newRemoteDb(remoteDbUrl, username, password);

    // Now we'll check to see if the user/password combo we have works
    // If it does, we'll get info on the database, otherwise we'll get a not_found
    // which is essentially an invalid login.
    // For security reasons we won't even attempt to provide more detail as to if it
    // was the username or password that they entered incorrectly
    userDb
      .info()
      .then((result: PouchDB.Core.DatabaseInfo & PouchDB.Core.Error) => {
        console.log("database info result", result);
        // Database does not exist, this could be an invalid username or the database has not
        // been setup correctly.
        // result.error === 'not_found'
        // Database exists, but either the username or password is incorrect
        // result.error === 'unauthorized'
        if (result.error === "not_found") {
          this.logout();
          this.setState({
            error: "User database is not accessible"
          });
        }

        if (result.error === "unauthorized") {
          // Nothing to do yet
        }
      })
      .catch((err: Error) => {
        console.error("An error has occurred getting database info", err);
      });

    return userDb;
  }

  getUserDbUrl(username: string): string {
    const buffer = Buffer.from(username);
    const hexUsername = buffer.toString("hex");

    // User specific db, this follows couchdb_peruser convention
    const userDbUrl =
      this.props.url.substring(0, this.props.url.lastIndexOf("/") + 1) +
      "userdb-" +
      hexUsername;

    return userDbUrl;
  }

  signUp = (username: string, password: string, email: string): void => {
    console.log("Signing up user " + username);

    this.authDb.signUp(
      username,
      password,
      {
        metadata: {
          email
        }
      },
      error => {
        // Check for error status = 409
        if (error) {
          // The document, aka user, already exists in the users db
          if (error && error.error === "conflict") {
            this.setState({ error: "Username is already taken" });
            return;
          }

          // Specific authentication error
          if (error && error.error && error.name === "authentication_error") {
            this.setState({
              error: error.message
            });
            return;
          }

          // Unknown, log it so we can take a closer look if needed
          console.info("An error occurred signing up", JSON.stringify(error));
          this.setState({
            error: "An error occurred while signing up"
          });
          return;
        }

        // TODO: Check that the database exists and report an error
        this.watchForUserDb(
          username,
          password,
          (response: PouchDB.Core.Error) => {
            // Most likely the user has not been setup yet
            if (response.error && response.error === "not_found") {
              // Redirect to the login screen
              this.setState({
                error: null,
                //message: "User has been created but your database is not ready yet, please check back soon.",
                internalRoute: ROUTE_LOGIN
              });
              return;
            }

            console.log("Database exists, proceeding to login.", response);
            this.login(username, password);
          }
        );
      }
    );
  };

  logout = (): void => {
    console.log("Logging out...");

    // Logout of the remote database
    this.remoteDb.logOut().catch(ex => console.error("Unable to logout", ex));

    // Clear any credentials we have stored
    this.props.rememberMe
      .clearCredentials()
      .catch(ex => console.error("Could not reset credentials " + ex));

    // Destroy our local database
    this.localDb
      .destroy()
      .then(() => {
        this.localDb = this.newLocalDb(this.props.localDatabase);

        // Clear our database instances and let our application know we are no longer authenticated
        this.setState({
          authenticated: false
        });
      })
      .catch(err => {
        console.log(err);
      });
  };

  // Set this as a property so we can bind it correctly as we pass it down
  login = async (username: string, password: string): Promise<void> => {
    this.remoteDb = this.getUserDb(username, password);

    // We use this method to set the cookie from CouchDB in the browser
    if (password) {
      try {
        const user = await this.remoteDb.logIn(username, password);
        console.log("User after logging in", user);
      } catch (ex) {
        console.log("Attempting to login, but ran into an issue", ex);

        if (ex.error && ex.error === "unauthorized") {
          this.setState({
            error: "Invalid login "
          });

          // Bail early, everything after this  is not relevant
          return;
        }
      }
    }

    // These credentials worked, so store them so we can reload them again later
    if (username && password) {
      this.props.rememberMe
        .setCredentials(username, password)
        .catch(ex => console.error("Could not store credentials" + ex));
    }

    // Since we are assumed to be logged in, let's get the user document so we have it
    try {
      // There is more data about the user in the _users document
      const session = await this.remoteDb.getSession();
      console.log("Current user session", session);
      this.setState({ user: session.userCtx });
    } catch (ex) {
      console.error("An error has occurred", ex);
    }

    // TODO: Add error handling
    this.remoteDb.replicate.to(this.localDb).on("complete", async () => {
      console.log("Initial replication is complete");

      this.setState({
        error: null,
        loaded: true,
        authenticated: true
      });

      if (!this.props.sync) {
        console.log("Syncing in the <Authentication/> component is disabled.");
        this.setState({
          // We aren't synced, but we mark it as such for the UI to proceed
          synced: true
        });

        return;
      }

      console.log("Setting up live sync");

      // Make our local database replicate to/from our user's remote database
      this.localDb
        .sync(this.remoteDb, {
          // Receive replication events after initial sync, so that we get ongoing changes
          live: true,
          // When errors occur, like we lose the network because we are offline, attempt to retry
          retry: true
        })
        .on("complete", info => {
          // This should never happen while we have live = true
          console.log("Syncing is complete", info);
        })
        .on("active", () => {
          console.log("Replication is active");
        })
        .on("paused", err => {
          console.log("Replication is paused", err);

          // Replication will pause when we are all caught up with pending changes
          if (!err && !this.state.synced) {
            this.setState({
              synced: true
            });
          }
        })
        .on("denied", err => {
          console.log("Replicated denied", err);
        })
        .on("change", change => {
          console.log("Replication change received", change);
        })
        .on("error", err => {
          console.error("An error has occurred setting up replication", err);
        })
        .catch(ex => {
          console.error("An error has occurred setting up replication", ex);
        });
    });
  };

  async componentDidMount(): Promise<void> {
    const session = await this.authDb.getSession();

    console.log("componentDidMount() user session", session);

    if (session.userCtx.name) {
      console.log("Found an existing user session", session.userCtx);
      await this.login(session.userCtx.name, null);
      return;
    }

    this.props.rememberMe
      .getCredentials()
      .then(credentials => {
        // If we do not have existing credentials, mark loaded and skip login attempt
        if (credentials === false) {
          // TODO: Revisit this, does this make sense when a remember me implementation is set?
          this.setState({ loaded: true });
          return;
        }

        console.log("Found existing credentials for " + credentials.username);

        // If we have login credentials stored in the, lets attempt a login
        const { username, password } = credentials;

        this.login(username, password);
      })
      .catch(ex => console.error("Failed to request credentials " + ex));
  }

  render(): React.ReactNode {
    // If we haven't completed our initial load yet, show a loader
    if (!this.state.loaded) {
      console.log("Waiting for initial database to load");
      return this.props.loading;
    }

    // We have loaded our remote database but we are not authenticated
    if (!this.state.authenticated) {
      if (this.state.internalRoute === ROUTE_SIGNUP) {
        console.log("Not authenticated, on sign up screen");

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

      console.log("Not authenticated, on login screen");

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

    // If we are authenticated but have not finished syncing, show a loader
    if (!this.state.synced) {
      console.log("Waiting for authenticated database to sync");
      return React.cloneElement(this.props.loading, {});
    }

    const props = {
      db: this.localDb,
      remoteDb: this.remoteDb,
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
