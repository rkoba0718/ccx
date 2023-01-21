import React from "react";
import { useParams, useLocation, useHistory } from "react-router-dom";
import { makeStyles, Typography, useTheme, Box } from "@material-ui/core";
import { TreeItem, TreeItemProps, TreeView } from "@material-ui/lab";
import {
	ChevronDown,
	ChevronRight,
	Folder,
	File as FileIcon
} from "mdi-material-ui";

import SplitPane from "components/atoms/SplitPane";
import PaneWithTitle from "components/atoms/PaneWithTitle";
import FilePath from "common/all/types/FilePath";
import FileId from "common/all/types/FileId";
import File from "common/all/types/File";
import CloneSetTree from "components/organisms/diff-view/clone/CloneSetTree";
import useMatchResult from "hooks/useMatchResult";

const useStyles = makeStyles((theme) => ({
	root: {
		"& > * > *": {
			width: "100%",
			height: "100%",
			"& > *:last-child": {
				overflowY: "scroll",
				height: 0
			}
		}
	},
	title: {
		display: "inline-block",
		verticalAlign: "middle",
		width: "100%"
	},
	labelRoot: {
		flex: "auto",
		minWidth: 0,
		display: "flex",
		flexDirection: "row",
		paddingRight: theme.spacing(2)
	},
	labelText: {
		fontWeight: "inherit"
	}
	// cloneIdList: {
	// 	padding: 0
	// }
}));

type Files = {
	id: number;
	path: FilePath;
}[];

type Props = {
	file: Files;
};

type DirectoryNode = {
	id: string;
	directories: {
		[key: string]: DirectoryNode;
	};
	files: {
		[key: string]: string;
	};
};

type FileNodeItemProps = TreeItemProps & {
	label: string;
};

const FileNodeItem: React.FunctionComponent<FileNodeItemProps> = ({
	label,
	...rest
}) => {
	const classes = useStyles(useTheme());

	return (
		<TreeItem
			classes={{ label: classes.labelRoot }}
			endIcon={<FileIcon />}
			label={
				<>
					<Box
						flex="auto"
						overflow="hidden"
						textOverflow="ellipsis"
						minWidth={0}
					>
						{label}
					</Box>
				</>
			}
			{...rest}
		/>
	);
};

const insertFile = (root: DirectoryNode, paths: string[]): void => {
	let parent = root;
	const traces: string[] = [];

	// create nodes recursively
	paths.slice(0, paths.length - 1).forEach((path) => {
		traces.push(path);
		if (!(path in parent.directories)) {
			parent.directories[path] = {
				id: traces.join("/"),
				directories: {},
				files: {}
			};
		}
		parent = parent.directories[path];
	});

	// insert file node
	const fileName = paths[paths.length - 1];
	parent.files[fileName] = [...traces, fileName].join("/");
};

const isMergeable = (current: DirectoryNode): boolean =>
	Object.keys(current.files).length === 0 &&
	Object.keys(current.directories).length === 1;

const optimizeTree = (root: DirectoryNode): DirectoryNode => {
	const startingNodes = [root];

	while (startingNodes.length > 0) {
		const start = startingNodes.pop() as DirectoryNode;
		const children = Object.entries(start.directories);

		while (children.length > 0) {
			let [name, toNode] = children.pop() as [string, DirectoryNode];
			const mergingPaths = [name];
			console.log(`check from ${mergingPaths[0]}`);

			while (isMergeable(toNode)) {
				[name] = Object.keys(toNode.directories);
				mergingPaths.push(name);
				toNode = toNode.directories[name];
			}
			console.log(`	${name} is not mergeable`);

			if (mergingPaths.length > 1) {
				const merged = mergingPaths.join("/");
				start.directories[merged] = toNode;
				delete start.directories[mergingPaths[0]];
				console.log(`	merged: ${mergingPaths}`);
				console.log(`	deleted: ${mergingPaths[0]}`);

				startingNodes.push(
					toNode
				); /*
				Object.values(toNode.directories).forEach((node) =>
					startingNodes.push(node)
				); */
			} else {
				startingNodes.push(toNode);
				console.log(`	pushed: ${toNode.id}`);
			}
		}
	}
	return root;
};

const buildTree = (files: Files): DirectoryNode => {
	const root: DirectoryNode = {
		id: "/",
		directories: {},
		files: {}
	};

	const list: Record<number, File> = {};
	const filesSize = files.length;
	for (let i = 0; i < filesSize; i += 1) {
		list[i] = {
			id: files[i].id as FileId,
			path: files[i].path
		};
	}

	Object.entries(list).forEach(([, file]) => {
		insertFile(root, file.path.split("/"));
	});
	return optimizeTree(root);
};

const renderFile = (name: string, node: string) => (
	<FileNodeItem key={node} nodeId={node} label={name} />
);

const renderTree = (
	label: string,
	parentName: string,
	parent: DirectoryNode
) => (
	<TreeItem
		key={parent.id}
		classes={{ label }}
		nodeId={parent.id}
		label={parentName}
	>
		{Object.entries(parent.directories)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([name, node]) => renderTree(label, name, node))}
		{Object.entries(parent.files)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([name, node]) => renderFile(name, node))}
	</TreeItem>
);

const useParentStyle = makeStyles((theme) => ({
	root: {
		fontSize: "70%",
		width: "100%"
	},
	label: {
		minWidth: 0,
		overflow: "hidden",
		textOverflow: "ellipsis"
	}
}));

const cumulativeJoin = (sum: string) => (value: string) => {
	sum = `${sum}/${value}`;
	return sum;
};

export const openSelectedFile = (selectedFile: string) => {
	if (!selectedFile) {
		return [];
	}

	const [head, ...tail] = selectedFile.split("/");
	return [head, ...tail.map(cumulativeJoin(head))];
};

const Explorer: React.FunctionComponent<Props> = ({ file }) => {
	const classes = useStyles();
	const style = useParentStyle(useTheme());
	const { pathname, search } = useLocation();
	const history = useHistory();

	const [result, dispatch] = useMatchResult();

	const root = React.useMemo(() => {
		return buildTree(file);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const [expanded, setExpanded] = React.useState<string[]>(() =>
		openSelectedFile(result.clones.path)
	);

	const onNodeToggle = React.useCallback(
		(event: React.ChangeEvent<{}>, nodeIds: string[]) =>
			setExpanded(nodeIds),
		[setExpanded]
	);

	const onNodeSelect = React.useCallback(
		(event: React.ChangeEvent<{}>, nodeId: string) => {
			history.push({
				pathname: `${pathname}`,
				search: `${search}${nodeId}`
			});
			dispatch({
				type: "set-file",
				payload: {
					path: `${nodeId}` as FilePath
				}
			});
		},
		[history, pathname, search, dispatch]
	);

	const tree = React.useMemo(() => {
		return (
			<>
				{Object.entries(root.directories)
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([name, node]) => renderTree(style.label, name, node))}
				{Object.entries(root.files)
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([name, node]) => renderFile(name, node))}
			</>
		);
	}, [root.directories, root.files, style.label]);

	return (
		<SplitPane
			className={classes.root}
			allowResize
			split="horizontal"
			defaultSize="55%"
		>
			<PaneWithTitle
				title={
					<Typography
						className={classes.title}
						noWrap
						variant="caption"
					>
						Files
					</Typography>
				}
			>
				<TreeView
					className={style.root}
					defaultParentIcon={<Folder />}
					defaultCollapseIcon={<ChevronDown />}
					defaultExpandIcon={<ChevronRight />}
					expanded={expanded}
					selected={result.clones.path}
					onNodeToggle={onNodeToggle}
					onNodeSelect={onNodeSelect}
				>
					{tree}
				</TreeView>
			</PaneWithTitle>
			<PaneWithTitle
				title={
					<Typography
						className={classes.title}
						noWrap
						variant="caption"
					>
						Clone Sets
					</Typography>
				}
			>
				<CloneSetTree path={result.clones.path} />
			</PaneWithTitle>
		</SplitPane>
	);
};

export default Explorer;
