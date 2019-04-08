import * as React from "react";
import PropTypes from "prop-types";
import PouchDB from "pouchdb";
import PouchDBAuthentication from "pouchdb-authentication";
import { RememberMe } from "./RememberMe";

// We only use the signUp method, maybe we don't need this?
PouchDB.plugin(PouchDBAuthentication);

const ROUTE_LOGIN = "login";
const ROUTE_SIGNUP = "signup";

export class Authentication extends React.Component {
  /*
  static propTypes = {
    localAdapter: PropTypes.string,
    localDatabase: PropTypes.string,
    // This could be more general purpose but we're just using it for the remote database URL right now
    url: (props, key, componentName, location, propFullName) => {
      const str = props[key];
      if (!str || /^\s*$/.test(str)) {
        throw new Error(
          "A valid URL must be specified for the remote database"
        );
      }
    },
    // Need a react node or element
    login: PropTypes.oneOfType([
      PropTypes.element,
      PropTypes.node,
      PropTypes.func
    ]).isRequired,
    // Need a react node or element
    signup: PropTypes.oneOfType([
      PropTypes.element,
      PropTypes.node,
      PropTypes.func
    ]).isRequired,
    // Should this be more react-specific?
    loading: PropTypes.element.isRequired,
    rememberMe: PropTypes.shape({
      getCredentials: PropTypes.func.isRequired,
      setCredentials: PropTypes.func.isRequired,
      clearCredentials: PropTypes.func.isRequired
    })
  };
  */

  static defaultProps = {
    sync: true,
    localAdapter: "idb",
    localDatabase: "local",
    // This is a default implementation that does not actually remember anything
    rememberMe: new RememberMe()
  };

  constructor(props) {
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

    console.log("Using the authDb property");
    // PouchDB instance for authenticating users against, takes a URL
    this.authDb = this.newRemoteDb(this.props.url);

    // PouchDB instance for local data storage (will use localAdapter property)
    this.localDb = this.newLocalDb(this.props.localDatabase);
    // PouchDB instance for syncing to/from
    this.remoteDb = null;
  }

  newLocalDb(database) {
    if (!database) {
      throw new Error("Local database name not specifed");
    }

    /*
    if (
      typeof database === "object" &&
      database.constructor.name === "PouchDB"
    ) {
      console.log(
        "Local db is already a valid PouchDB instance, just passing it along"
      );
      return database;
    }
    */

    console.log(
      "Setting up local db " + database + " using " + this.props.localAdapter
    );

    return new PouchDB(database, {
      adapter: this.props.localAdapter
    });
  }

  newRemoteDb(url, username, password) {
    console.log("Setting up remote db " + url);

    if (!url) {
      throw new Error("Remote database url not specified");
    }

    // Every remote database should skip setup
    const defaults = { skip_setup: true };

    const options =
      // If a username and password is provided
      username && password
        ? // Append auth options to the connections
          { ...defaults, auth: { username, password } }
        : // Otherwise just use the defaults
          defaults;

    return new PouchDB(url, options);
  }

  dbInfo(db, success, fail) {
    db.info().then(info => {
      if (
        info &&
        info.error &&
        (info.error == "not_found" ||
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

  watchForUserDb(username, password, callback) {
    const userDb = this.getUserDb(username, password);

    let retries = 0;

    const checkDb = () =>
      this.dbInfo(
        userDb,
        // Success, our database is setup
        info => {
          console.log("Success, our database is setup!", info);
          //userDb.close(() => {});
          callback(info);
        },
        info => {
          console.log("Fail, our database is not setup yet!", info);

          retries++;

          if (retries > 5) {
            userDb.close(() => {});
            return;
          }

          setTimeout(() => {
            console.log("Attempting to check db again");
            checkDb();
          }, 2500);
        }
      );

    checkDb();
  }

  getUserDb(username, password) {
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
      .then(result => {
        // Database does not exist, this could be an invalid username or the database has not
        // been setup correctly.
        // result.error === 'not_found'
        // Database exists, but either the username or password is incorrect
        // result.error === 'unauthorized'
        if (result.error) {
          /*
          this.setState({
            error: "Invalid login "
          });
          */
        }
      })
      .catch(err => {
        console.error(err);
      });

    return userDb;
  }

  getUserDbUrl(username) {
    const buffer = Buffer.from(username);
    const hexUsername = buffer.toString("hex");

    // User specific db, this follows couchdb_peruser convention
    const userDbUrl =
      this.props.url.substring(0, this.props.url.lastIndexOf("/") + 1) +
      "userdb-" +
      hexUsername;

    return userDbUrl;
  }

  signUp = (username, password, email) => {
    console.log("Signing up user " + username);

    this.authDb.signup(
      username,
      password,
      {
        metadata: {
          email
        }
      },
      (error, response) => {
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
        this.watchForUserDb(username, password, response => {
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
        });
      }
    );
  };

  logout = () => {
    console.log("Logging out...");

    // Logout of the remote database
    this.remoteDb.logout().catch(ex => console.error("Unable to logout", ex));

    // Clear any credentials we have stored
    this.props.rememberMe
      .clearCredentials()
      .catch(ex => console.error("Could not reset credentials " + ex));

    // Destroy our local database
    this.localDb
      .destroy()
      .then(response => {
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
  login = async (username, password) => {
    this.remoteDb = this.getUserDb(username, password);

    // We use this method to set the cookie from CouchDB in the browser
    if (password) {
      try {
        const session = await this.remoteDb.login(username, password);
        console.log("Session after logging in", session);
      } catch (ex) {
        console.log("Attempting to login, but ran into an issue", ex);

        if (ex.error && ex.error === "unauthorized") {
          this.setState({
            error: "Invalid login "
          });
        }
      }
    }

    // These credentials worked, so store them so we can reload them again later
    if (username && password) {
      this.props.rememberMe
        .setCredentials(username, password)
        .then(() => {})
        .catch(ex => console.error("Could not store credentials" + ex));
    }

    // Since we are assumed to be logged in, let's get the user document so we have it
    try {
      const user = await this.remoteDb.getUser(username);
      this.setState({ user });
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

  async componentDidMount() {
    const session = await this.authDb.getSession();

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
          console.log("Did not find existing credentials");

          // TODO: Revisit this, does this make sesne when a remember me implementation is set?
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

  render() {
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
          navigateToLogin: () =>
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
        navigateToSignup: () =>
          this.setState({ error: null, internalRoute: ROUTE_SIGNUP }),
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

    console.log("databases", this.localDb, this.remoteDb);

    // We are authenticated and synced so load our application
    if (!React.isValidElement(this.props.children)) {
      return React.createElement(this.props.children, props);
    } else {
      return React.cloneElement(this.props.children, props);
    }
  }
}
