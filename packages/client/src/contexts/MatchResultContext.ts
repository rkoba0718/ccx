import React from "react";

import { State, Action } from "reducers/matchReducer";

export { State, Action };

const MatchResultContext = React.createContext<
	[State, React.Dispatch<Action>]
	// eslint-disable-next-line @typescript-eslint/no-empty-function
>([(undefined as unknown) as State, (): void => {}]);

export default MatchResultContext;
