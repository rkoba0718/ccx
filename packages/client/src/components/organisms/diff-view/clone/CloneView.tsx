import React from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { makeStyles, Typography, Tooltip } from "@material-ui/core";

import useMatchResult from "hooks/useMatchResult";

import SplitPane from "components/atoms/SplitPane";
import DiffCloneView from "components/organisms/diff-view/clone/DiffCloneView";
import PairedCloneView from "components/organisms/result-view/PairedCloneView";
import PaneWithTitle from "components/atoms/PaneWithTitle";
import FileId from "common/all/types/FileId";
import FilePath from "common/all/types/FilePath";

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
	allFiles: Record<
		number,
		{
			path: FilePath;
			base?: FileId;
			comparing?: FileId;
		}
	>;
};

const CloneView: React.FunctionComponent<Props> = ({ revision, allFiles }) => {
	const { pathname, search, hash } = useLocation();
	const classes = useStyles();
	const { project } = useParams<{
		project: string;
	}>();

	const [result] = useMatchResult();

	const [selected, setSelected] = React.useState<string | null>(null);

	const [paired, setPaired] = React.useState<{
		path: string;
		begin: number;
		end: number;
	} | null>(null);

	React.useEffect(() => {
		if (hash.startsWith("#")) {
			const str = hash.split("#")[1];
			if (str.startsWith("b")) {
				const tmp = str.split("b")[1];
				const row = Number(tmp.split("-")[0]);
				const col = Number(tmp.split("-")[1]);
				if (col === 0) {
					setSelected(str);
					if (result.clones.unmatchedBaseCloneSets) {
						const file =
							allFiles[
								result.clones.unmatchedBaseCloneSets[row][
									col + 1
								].file
							].path;
						setPaired({
							path: file,
							begin:
								result.clones.unmatchedBaseCloneSets[row][
									col + 1
								].begin,
							end:
								result.clones.unmatchedBaseCloneSets[row][
									col + 1
								].end
						});
					}
					return;
				}
				if (result.clones.unmatchedBaseCloneSets) {
					const fileId =
						result.clones.unmatchedBaseCloneSets[row][0].file;
					if (
						fileId ===
						result.clones.unmatchedBaseCloneSets[row][col].file
					) {
						setSelected(str);
						const file =
							allFiles[
								result.clones.unmatchedBaseCloneSets[row][0]
									.file
							].path;
						setPaired({
							path: file,
							begin:
								result.clones.unmatchedBaseCloneSets[row][0]
									.begin,
							end:
								result.clones.unmatchedBaseCloneSets[row][0].end
						});
					} else {
						setSelected(`b${row}-0`);
						const file =
							allFiles[
								result.clones.unmatchedBaseCloneSets[row][col]
									.file
							].path;
						setPaired({
							path: file,
							begin:
								result.clones.unmatchedBaseCloneSets[row][col]
									.begin,
							end:
								result.clones.unmatchedBaseCloneSets[row][col]
									.end
						});
					}
				}
			} else if (str.startsWith("c")) {
				const tmp = str.split("c")[1];
				const row = Number(tmp.split("-")[0]);
				const col = Number(tmp.split("-")[1]);
				if (col === 0) {
					setSelected(str);
					if (result.clones.unmatchedComparingCloneSets) {
						const {
							file,
							...rest
						} = result.clones.unmatchedComparingCloneSets[row][
							col + 1
						];
						const size = Object.keys(allFiles).length;
						for (let i = 0; i < size; i += 1) {
							if (allFiles[i].comparing === file) {
								const filepath = allFiles[i].path;
								setPaired({
									path: filepath,
									...rest
								});
								break;
							}
						}
					}
					return;
				}
				if (result.clones.unmatchedComparingCloneSets) {
					const fileId =
						result.clones.unmatchedComparingCloneSets[row][0].file;
					if (
						fileId ===
						result.clones.unmatchedComparingCloneSets[row][col].file
					) {
						setSelected(str);
						const {
							file,
							...rest
						} = result.clones.unmatchedComparingCloneSets[row][0];
						const size = Object.keys(allFiles).length;
						for (let i = 0; i < size; i += 1) {
							if (allFiles[i].comparing === file) {
								const filepath = allFiles[i].path;
								setPaired({
									path: filepath,
									...rest
								});
								break;
							}
						}
					} else {
						setSelected(`c${row}-0`);
						const {
							file,
							...rest
						} = result.clones.unmatchedComparingCloneSets[row][col];
						const size = Object.keys(allFiles).length;
						for (let i = 0; i < size; i += 1) {
							if (allFiles[i].comparing === file) {
								const filepath = allFiles[i].path;
								setPaired({
									path: filepath,
									...rest
								});
								break;
							}
						}
					}
				}
			} else if (str.startsWith("m")) {
				setSelected(str.split("-")[0]);
				const bc = str.split("m")[1];
				if (bc.startsWith("b")) {
					const tmp = bc.split("b")[1];
					const row = Number(tmp.split("-")[0]);
					const col = Number(tmp.split("-")[1]);
					if (result.clones.matchBaseCloneSets) {
						const fileId =
							result.clones.matchBaseCloneSets[row][col].file;
						const file = allFiles[fileId].path;
						setPaired({
							path: file,
							begin:
								result.clones.matchBaseCloneSets[row][col]
									.begin,
							end: result.clones.matchBaseCloneSets[row][col].end
						});
					}
				} else if (bc.startsWith("c")) {
					const tmp = bc.split("c")[1];
					const row = Number(tmp.split("-")[0]);
					const col = Number(tmp.split("-")[1]);
					if (result.clones.matchComparingCloneSets) {
						const {
							file,
							...rest
						} = result.clones.matchComparingCloneSets[row][col];
						const size = Object.keys(allFiles).length;
						for (let i = 0; i < size; i += 1) {
							if (allFiles[i].comparing === file) {
								const filepath = allFiles[i].path;
								setPaired({
									path: filepath,
									...rest
								});
								break;
							}
						}
					}
				}
			}
			return;
		}
		setSelected(null);
		setPaired(null);
	}, [hash, setSelected, setPaired, result, allFiles]);

	return (
		<SplitPane
			className={classes.root}
			split="vertical"
			minSize={250}
			defaultSize="50%"
		>
			<PaneWithTitle
				title={
					<Tooltip title={result.clones.path}>
						<Typography
							className={classes.title}
							noWrap
							variant="caption"
						>
							{result.clones.path}
						</Typography>
					</Tooltip>
				}
			>
				<DiffCloneView revision={revision} selected={selected} />
			</PaneWithTitle>
			<React.Suspense fallback="loading">
				<PaneWithTitle
					title={
						paired?.path ? (
							<Tooltip
								title={`Open in the left pane: ${paired.path}`}
							>
								<Typography
									className={classes.title}
									noWrap
									variant="caption"
								>
									{paired?.path}
								</Typography>
							</Tooltip>
						) : (
							<></>
						)
					}
				>
					<PairedCloneView
						project={project}
						revision={revision}
						paired={paired}
					/>
				</PaneWithTitle>
			</React.Suspense>
		</SplitPane>
	);
};

export default CloneView;
