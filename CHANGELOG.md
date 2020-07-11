# Changelog

## 0.3.1 (July 11, 2020)

* Added the `scaffold` property that allows the disabling of the internal routing and rendering of the logins/signup views.

## 0.3.0 (July 11, 2020)

* Added a changelog!
* Properties are no longer passed down to children of `<Authentication />`. You will either need to use the `<Context.Consumer>` or the higher order function `withAuthentication()` to have these properties passed down to your child components.
* Components have been moved around internally.
* New `<Authenticated />` and `<Unauthenticated />` have been added to show/hide content based upon whether or not the user is logged in.
* Both `<Login />` and `<SignUp />` no longer clone element their respective views if an element is passed in, you must specify a type now.
* Moved `isomorphic-fetch` to `devDepencneis`, if you need this you will need to import it on your own now.
* Local DB is now setup much earlier in the cycle (this is important for future changes to support apps where you can authenticate later).
