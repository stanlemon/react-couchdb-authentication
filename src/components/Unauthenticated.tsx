import * as React from "react";
import { Context } from "./Authentication";

export function Unauthenticated({
  children,
}: {
  children: React.ReactElement;
}): React.ReactElement {
  return (
    <Context.Consumer>
      {({ authenticated }: { authenticated: boolean }) =>
        authenticated ? null : children
      }
    </Context.Consumer>
  );
}
