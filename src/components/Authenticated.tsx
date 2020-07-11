import * as React from "react";
import { Context } from "../";

export function Authenticated({
  children,
}: {
  children: React.ReactElement;
}): React.ReactElement {
  return (
    <Context.Consumer>
      {({ authenticated }: { authenticated: boolean }) =>
        authenticated ? children : null
      }
    </Context.Consumer>
  );
}
