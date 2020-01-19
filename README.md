# React CouchDB Authentication Component

[![Build Status](https://travis-ci.org/stanlemon/react-couchdb-authentication.svg?branch=master)](https://travis-ci.org/stanlemon/react-couchdb-authentication)

[![npm version](https://badge.fury.io/js/%40stanlemon%2Freact-couchdb-authentication.svg)](https://badge.fury.io/js/%40stanlemon%2Freact-couchdb-authentication)

React component for streamlining user authentication against an [Apache CouchDB](http://couchdb.apache.org) instance.
If you're building a React application and want to let the _amazing_ CouchDB be your backend, you can
take advantage of CouchDB's userdb feature, and with this component streamline using CouchDB to sign up
and login users to a secure application.  Each user's database is replicated locally to a 
[PouchDB](https://pouchdb.com) instance that you can use to wrok with documents.

## Getting Started

You will need an instance of CouchDB. If you don't have one, [the CouchDB install docs will take care of you](https://docs.couchdb.org/en/stable/install/index.html).
In your CouchDB config you will need to enable `couch_user.enable` and `couch_user.delete_dbs`. You can do this through Fauxton, CouchDB's excellent UI or with the following commands:

```
curl -X PUT localhost:5984/_node/_local/_config/couch_peruser/enable -d "\"true\""
curl -X PUT localhost:5984/_node/_local/_config/couch_peruser/delete_dbs -d "\"true\""
```

Enabling these settings ensures that once a user signs up, their dedicated database is setup (and vice versa when their user is deleted).

## Example

The `<Authentication/>` component is easy to use, simply wrap your `<App />` and use the provided `<Login />` and `<SignUp />` components to get going. You can customize your login and signup views later.

```jsx
<Authentication
  url="http://localhost:59"
  login={<Login />}
  signup={<SignUp />}
/>
  <h1>Authenticated!</h1>
</Authentication>
```

## Troubleshooting

Most issues are due to CouchDB being misconfigured, or cookies already being set.  If you've pulled up Fauxton in your browser you will want to clear the cookies for your CouchDB instance before using this component.

## Debug

This component has a fair amount of logging that can give you better insight into it's behavior. To see that logging you can set `debug={true}` on the `<Authentication/>` component and everything will be logged out to the console. _Do not do this in production!_


## Building & Tooling

To get started, you can build the components using Typescript by simply doing:

    npm install
    npm run build

You can lint the source by doing:

    npm run lint

You can run tests by doing:

    npm test

Tests require a working CouchDB instance. You can checkout the tests on [TravisCI](https://travis-ci.org/stanlemon/react-couchdb-authentication).
