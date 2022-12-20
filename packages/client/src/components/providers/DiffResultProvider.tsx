import React from "react";
import { useParams, useLocation } from "react-router-dom";

import { MappingResult } from "common/all/types/EDetectionResult";

import reducer, { defaultState } from "reducers/matchReducer";
import MatchResultContext from "contexts/MatchResultContext";
import FilePath from "common/all/types/FilePath";
import useMappingResult from "hooks/useMappingResult";

type Props = {
	children: React.ReactNode;
};

const DiffResultProvider: React.FunctionComponent<Props> = ({ children }) => {
	const { pathname } = useLocation();
	const { project } = useParams<Record<"project", string>>();
	const { base, comparing, revision, result } = useMappingResult();

	const [mresult, dispatch] = React.useReducer(
		reducer,
		result,
		(matchResult) => {
			const split = pathname.split(
				`/home/${project}/diff/plot/clones?b=${base}&c=${comparing}&r=${revision}/`
			);
			if (split.length > 0) {
				const path = split[1] as FilePath;
				const found = Object.values(result.clonesPerFile).find(
					(file) => file.path === path
				);
				if (found) {
					return defaultState({
						result: matchResult,
						clones: found
					});
				}
			}
			return defaultState({
				result: matchResult,
				clones: result.clonesPerFile[0]
			});
		}
	);

	React.useEffect(() => {
		const split = pathname.split(
			`/home/${project}/diff/plot/clones?b=${base}&c=${comparing}&r=${revision}/`
		);
		if (split.length > 0) {
			dispatch({
				type: "set-file",
				payload: {
					path: split[1] as FilePath
				}
			});
		}
	}, [project, pathname, base, comparing, revision, dispatch]);

	return (
		<MatchResultContext.Provider value={[mresult, dispatch]}>
			{children}
		</MatchResultContext.Provider>
	);
};

export default DiffResultProvider;
