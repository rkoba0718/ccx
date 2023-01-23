import React from "react";
import { CircularProgress, makeStyles } from "@material-ui/core";

import SplitPane from "components/atoms/SplitPane";
import Explorer from "components/organisms/diff-view/clone/Explorer";

import useMappingResult from "hooks/useMappingResult";
import DiffResultProvider from "components/providers/DiffResultProvider";
import FilePath from "common/all/types/FilePath";

const CloneView = React.lazy(
	() => import("components/organisms/diff-view/clone/CloneView")
);

type Props = {
	revision: string;
};

const useStyles = makeStyles({
	root: {
		"& > *": {
			height: "100%"
		}
	}
});

const useMatchClones = () => {
	const { result } = useMappingResult();
	const allF = result.allFiles;
	return React.useMemo(() => {
		const file: {
			id: number;
			path: FilePath;
		}[] = [];

		Object.entries(result.clonesPerFile).forEach(([id, c]) => {
			file.push({
				id: Number(id),
				path: c.path
			});
		});

		return {
			file,
			allF
		};
	}, [result, allF]);
};

const DiffView: React.FunctionComponent<Props> = ({ revision }) => {
	const classes = useStyles();
	const m = useMatchClones();

	return (
		<DiffResultProvider>
			<SplitPane
				className={classes.root}
				allowResize
				split="vertical"
				minSize={300}
			>
				<Explorer file={m.file} />
				<React.Suspense fallback={<CircularProgress />}>
					<CloneView revision={revision} allFiles={m.allF} />
				</React.Suspense>
			</SplitPane>
		</DiffResultProvider>
	);
};

export default DiffView;
