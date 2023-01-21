import React from "react";
import { Link, useLocation, useHistory } from "react-router-dom";
import { List, ListItemText } from "@material-ui/core";

import { TreeView, TreeItem } from "@material-ui/lab";
import { ChevronDown, ChevronRight } from "mdi-material-ui";

import useMatchResult from "hooks/useMatchResult";

import ListItemHashLink from "components/atoms/ListItemHashLink";
import Fragment from "common/all/types/Fragment";
import FilePath from "common/all/types/FilePath";

type Props = {
	path: FilePath;
};

type MatchCloneSetTreeItemProps = {
	id: number;
	matchBase: Fragment;
	matchComparing: Fragment;
	cloneSet: Fragment[];
	pairSet: Fragment[];
};

const MatchCloneSetTreeItem: React.FunctionComponent<MatchCloneSetTreeItemProps> = ({
	id,
	matchBase,
	matchComparing,
	cloneSet,
	pairSet
}) => {
	const { pathname, hash, search } = useLocation();
	const intId = id.toFixed();
	const idHash = `#m${intId}`;
	return (
		<TreeItem nodeId={idHash} label={`#${id}`}>
			<TreeItem
				nodeId={matchBase.begin.toFixed() + 0.5}
				label={`Line:${matchBase.begin}-${matchBase.end - 1}/${
					matchComparing.begin
				}-${matchComparing.end - 1} #${intId}`}
			>
				<TreeItem nodeId={matchBase.end.toFixed()} label="Base">
					{cloneSet.map((mb, num) => (
						<ListItemHashLink
							key={`${idHash}-${num.toFixed()}`}
							selected={hash === `${idHash}b-${num}`}
							to={`${pathname}${search}#mb${intId}-${num}`}
							nodeId={`#mb${intId}-${num}`}
						>
							<ListItemText
								primary={`Ln ${mb.begin}-${mb.end - 1} #${num}`}
							/>
						</ListItemHashLink>
					))}
				</TreeItem>
				<TreeItem
					nodeId={matchBase.end.toFixed() + 1.5}
					label="Comparing"
				>
					{pairSet.map((mc, num) => (
						<ListItemHashLink
							key={`${idHash}-${num.toFixed()}`}
							selected={hash === `${idHash}c-${num}`}
							to={`${pathname}${search}#mc${intId}-${num}`}
							nodeId={`#mc${intId}-${num}`}
						>
							<ListItemText
								primary={`Ln ${mc.begin}-${mc.end - 1} #${num}`}
							/>
						</ListItemHashLink>
					))}
				</TreeItem>
			</TreeItem>
		</TreeItem>
	);
};

type UnmatchedCloneSetTreeItemProps = {
	id: number;
	cloneSet: Fragment[];
	node: string;
};

const UnmatchedCloneSetTreeItem: React.FunctionComponent<UnmatchedCloneSetTreeItemProps> = ({
	id,
	cloneSet,
	node
}) => {
	const { pathname, hash, search } = useLocation();
	const intId = id.toFixed();
	const idHash = `#${node}${intId}`;
	return (
		<TreeItem nodeId={idHash} label={`#${id}`}>
			{cloneSet.map((c, num) => (
				<ListItemHashLink
					key={`${idHash}-${num.toFixed()}`}
					selected={hash === `${idHash}-${num}`}
					to={`${pathname}${search}${idHash}-${num}`}
					nodeId={`#${idHash}-${num}`}
				>
					<ListItemText
						primary={`Ln ${c.begin}-${c.end - 1} #${num}`}
					/>
				</ListItemHashLink>
			))}
		</TreeItem>
	);
};

const useSelected = () => {
	const { hash } = useLocation();
	return React.useMemo(() => {
		if (hash.startsWith("#")) {
			return hash.split("#")[1];
		}

		return null;
	}, [hash]);
};

const CloneSetTree: React.FunctionComponent<Props> = ({ path }) => {
	const { pathname, hash, search } = useLocation();
	const [result] = useMatchResult();
	const selected = useSelected();
	const history = useHistory();

	let matchBases: Fragment[] = [];
	let matchComparings: Fragment[] = [];
	let unmatchedBaseCloneSets: Fragment[][] = [];
	let unmatchedComparingCloneSets: Fragment[][] = [];
	let matchBaseCloneSets: Fragment[][] = [];
	let matchComparingCloneSets: Fragment[][] = [];
	if (result.clones.matchBases && result.clones.matchComparings) {
		matchBases = [...result.clones.matchBases];
		matchComparings = [...result.clones.matchComparings];
	}
	if (result.clones.unmatchedBaseCloneSets) {
		unmatchedBaseCloneSets = [...result.clones.unmatchedBaseCloneSets];
	}
	if (result.clones.unmatchedComparingCloneSets) {
		unmatchedComparingCloneSets = [
			...result.clones.unmatchedComparingCloneSets
		];
	}
	if (
		result.clones.matchBaseCloneSets &&
		result.clones.matchComparingCloneSets
	) {
		matchBaseCloneSets = [...result.clones.matchBaseCloneSets];
		matchComparingCloneSets = [...result.clones.matchComparingCloneSets];
	}

	const onNodeSelect = React.useCallback(
		(event: React.ChangeEvent<{}>, nodeId: string) => {
			if (!nodeId.includes("#") || !nodeId.includes("-")) {
				return;
			}
			const sharp = search.indexOf("#");
			let preSearch = search;
			if (sharp !== -1) {
				preSearch = search.substring(0, sharp);
			}
			history.push({
				pathname: `${pathname}`,
				search: `${preSearch}${path}${nodeId}`
			});
		},
		[history, pathname, search, path]
	);

	return (
		<TreeView
			defaultCollapseIcon={<ChevronDown />}
			defaultExpandIcon={<ChevronRight />}
			onNodeSelect={onNodeSelect}
		>
			<TreeItem nodeId="Match" label="Clone Sets in Matched Clone">
				{matchBaseCloneSets.map((m, id) => (
					<MatchCloneSetTreeItem
						key={`m-${id.toFixed()}`}
						id={id}
						matchBase={matchBases[id]}
						matchComparing={matchComparings[id]}
						cloneSet={m}
						pairSet={matchComparingCloneSets[id]}
					/>
				))}
			</TreeItem>
			<TreeItem nodeId="Base" label="Base Clone Sets Unmatched">
				{unmatchedBaseCloneSets.map((b, id) => (
					<UnmatchedCloneSetTreeItem
						key={`ub-${id.toFixed()}`}
						id={id}
						cloneSet={b}
						node="b"
					/>
				))}
			</TreeItem>
			<TreeItem nodeId="Comparing" label="Comparing Clone Sets Unmatched">
				{unmatchedComparingCloneSets.map((c, id) => (
					<UnmatchedCloneSetTreeItem
						key={`ub-${id.toFixed()}`}
						id={id}
						cloneSet={c}
						node="c"
					/>
				))}
			</TreeItem>
		</TreeView>
	);
};

export default CloneSetTree;
