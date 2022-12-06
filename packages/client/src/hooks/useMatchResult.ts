import React from "react";
import MatchResultContext, { State, Action } from "contexts/MatchResultContext";

const useMatchResult = (): [State, React.Dispatch<Action>] =>
	React.useContext(MatchResultContext);

export { State };

export default useMatchResult;
