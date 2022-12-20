import React from "react";
import { useLocation } from "react-router-dom";
import { List, ListItemText } from "@material-ui/core";

import useMatchResult from "hooks/useMatchResult";

import ListItemHashLink from "components/atoms/ListItemHashLink";
import Fragment from "common/all/types/Fragment";

type Props = {
	className?: string;
};

const CloneIdList: React.FunctionComponent<Props> = ({ className }) => {
	const { pathname, hash, search } = useLocation();
	const [result] = useMatchResult();

	let matchBaseClones: Fragment[] = [];
	let matchComparingClones: Fragment[] = [];
	let baseClones: Fragment[] = [];
	let comparingClones: Fragment[] = [];
	if (result.clones.matchBaseClones && result.clones.matchComparingClones) {
		matchBaseClones = [...result.clones.matchBaseClones];
		matchComparingClones = [...result.clones.matchComparingClones];
	}
	if (result.clones.baseClones) {
		const unmatch = result.clones.baseClones.filter(
			(b) => !matchBaseClones.includes(b)
		);
		baseClones = unmatch;
	}
	if (result.clones.comparingClones) {
		const unmatch = result.clones.comparingClones.filter(
			(c) => !matchComparingClones.includes(c)
		);
		comparingClones = unmatch;
	}
	return (
		<List dense className={className}>
			{baseClones.map((b, id) => {
				const intId = id.toFixed();
				const idHash = `#b${intId}`;

				return (
					<ListItemHashLink
						key={`${idHash}-${b.begin}`}
						selected={hash === idHash}
						to={`${pathname}${search}${idHash}`}
						nodeId={b.begin.toFixed()}
					>
						<ListItemText
							primary={`Line:${b.begin}-${b.end - 1} #b${intId}`}
						/>
					</ListItemHashLink>
				);
			})}
			{comparingClones.map((c, id) => {
				const intId = id.toFixed();
				const idHash = `#c${intId}`;

				return (
					<ListItemHashLink
						key={`${idHash}-${c.begin}`}
						selected={hash === idHash}
						to={`${pathname}${search}${idHash}`}
						nodeId={c.begin.toFixed()}
					>
						<ListItemText
							primary={`Line:${c.begin}-${c.end - 1} #c${intId}`}
						/>
					</ListItemHashLink>
				);
			})}
			{matchBaseClones.map((m, id) => {
				const intId = id.toFixed();
				const idHash = `#m${intId}`;

				return (
					<ListItemHashLink
						key={`${idHash}-${m.begin}`}
						selected={hash === idHash}
						to={`${pathname}${search}${idHash}`}
						nodeId={m.begin.toFixed()}
					>
						<ListItemText
							primary={`Line:${m.begin}-${m.end - 1}/${
								matchComparingClones[id].begin
							}-${matchComparingClones[id].end - 1} #m${intId}`}
						/>
					</ListItemHashLink>
				);
			})}
		</List>
	);
};

export default CloneIdList;
