# Changelog

## 0.7.0 (Februayr 12, 2022)

* Improved Typescript support.
## 0.6.0 (June 27, 2021)

* Dependency updates
* Fix user profile loading bug
* Example app now proxies CouchDB

## 0.5.0 (December 29, 2020)

* Dependency updates and cleanup.

## 0.4.1 (July 12, 2020)

* `<Login />` and `<SignUp />` no longer require properties other than `component`, making them easier to use in contexts where `scaffold` is set to `false`.

## 0.3.2 (July 12, 2020)

* Lower tsconfig target when building to `es2020`.

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
