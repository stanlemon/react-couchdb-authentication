import * as React from "react";
import { Context } from "./Authentication";

export function Authenticated({
  children,
}: {
  children: React.ReactElement;
}): React.ReactElement {
  return (
    <Context.Consumer>
      {({ authenticated }) => (authenticated ? children : null)}
    </Context.Consumer>
  );
}
