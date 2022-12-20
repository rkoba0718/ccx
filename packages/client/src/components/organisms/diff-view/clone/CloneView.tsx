import React from "react";
import { useLocation } from "react-router-dom";
import { makeStyles, Typography, Tooltip } from "@material-ui/core";

import useMatchResult from "hooks/useMatchResult";

import SplitPane from "components/atoms/SplitPane";
import DiffCloneView from "components/organisms/diff-view/clone/DiffCloneView";
import PaneWithTitle from "components/atoms/PaneWithTitle";

const useStyles = makeStyles({
	root: {
		"& > * > *": {
			width: "100%",
			height: "100%",
			"& > *:last-child": {
				height: 0
			}
		}
	},
	title: {
		display: "inline-block",
		verticalAlign: "middle",
		width: "100%"
	}
});

type Props = {
	revision: string;
};

const CloneView: React.FunctionComponent<Props> = ({ revision }) => {
	const { hash } = useLocation();
	const classes = useStyles();

	const [result] = useMatchResult();

	const [selected, setSelected] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (hash.startsWith("#")) {
			const str = hash.split("#")[1];
			setSelected(str);
			return;
		}
		setSelected(null);
	}, [hash, setSelected, result]);

	return (
		<SplitPane
			className={classes.root}
			split="vertical"
			minSize={250}
			defaultSize="50%"
		>
			<PaneWithTitle
				title={
					<Tooltip title="Base Code">
						<Typography
							className={classes.title}
							noWrap
							variant="caption"
						>
							Base Code
						</Typography>
					</Tooltip>
				}
			>
				<DiffCloneView
					revision={revision}
					selected={selected}
					orientation="left"
				/>
			</PaneWithTitle>
			<PaneWithTitle
				title={
					<Tooltip title="Comparing Code">
						<Typography
							className={classes.title}
							noWrap
							variant="caption"
						>
							Comparing Code
						</Typography>
					</Tooltip>
				}
			>
				<DiffCloneView
					revision={revision}
					selected={selected}
					orientation="right"
				/>
			</PaneWithTitle>
		</SplitPane>
	);
};

export default CloneView;
